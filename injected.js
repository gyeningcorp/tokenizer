/**
 * Tokenizer — injected.js
 * Runs in PAGE context (not extension sandbox).
 * Wraps fetch + XHR to intercept LLM API responses
 * and extract input/output token counts from JSON payloads.
 * Posts messages to content.js via window.postMessage.
 */
(function () {
  if (window.__TokenizerInjected) return;
  window.__TokenizerInjected = true;

  const ORIGIN = "tokenizer-interceptor";

  // ─── Streaming SSE parser ────────────────────────────────────────────────
  function parseSSEChunks(text) {
    let inputTokens = 0, outputTokens = 0;
    const lines = text.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const obj = JSON.parse(raw);
        // OpenAI Chat Completions streaming
        if (obj.usage) {
          inputTokens = Math.max(inputTokens, obj.usage.prompt_tokens || 0);
          outputTokens = Math.max(outputTokens, obj.usage.completion_tokens || 0);
        }
        // Anthropic streaming
        if (obj.type === "message_start" && obj.message && obj.message.usage) {
          inputTokens = Math.max(inputTokens, obj.message.usage.input_tokens || 0);
        }
        if (obj.type === "message_delta" && obj.usage) {
          outputTokens = Math.max(outputTokens, obj.usage.output_tokens || 0);
        }
        // Anthropic complete
        if (obj.type === "message" && obj.usage) {
          inputTokens = Math.max(inputTokens, obj.usage.input_tokens || 0);
          outputTokens = Math.max(outputTokens, obj.usage.output_tokens || 0);
        }
      } catch (_) {}
    }
    return { inputTokens, outputTokens };
  }

  // ─── JSON response parser (non-streaming) ───────────────────────────────
  function parseJSON(obj) {
    let inputTokens = 0, outputTokens = 0;
    // OpenAI format
    if (obj.usage) {
      inputTokens = obj.usage.prompt_tokens || obj.usage.input_tokens || 0;
      outputTokens = obj.usage.completion_tokens || obj.usage.output_tokens || 0;
    }
    // Anthropic format
    if (obj.input_tokens) inputTokens = obj.input_tokens;
    if (obj.output_tokens) outputTokens = obj.output_tokens;
    // HuggingFace Inference API
    if (Array.isArray(obj) && obj[0] && obj[0].generated_text) {
      // No token count in HF API response by default — estimate handled in content.js
      outputTokens = -1; // sentinel: let content.js estimate
    }
    return { inputTokens, outputTokens };
  }

  // ─── Post to content.js ──────────────────────────────────────────────────
  function emit(data) {
    window.postMessage({ __source: ORIGIN, ...data }, "*");
  }

  // ─── Endpoint detection ──────────────────────────────────────────────────
  function isLLMEndpoint(url) {
    if (!url) return false;
    return (
      url.includes("/v1/chat/completions") ||
      url.includes("/v1/messages") ||
      url.includes("/v1/completions") ||
      url.includes("/api/chat") ||
      url.includes("/backend-api/conversation") ||
      url.includes("/backend-anon/conversation") ||
      url.includes("/v1/generate") ||
      url.includes("/inference/") ||
      url.includes("aistudio.google.com") ||
      url.includes("/api/generate") ||
      url.includes("/models/") ||
      (url.includes("/backend/") && url.includes("stream")) ||
      // Claude.ai native endpoints
      url.includes("/completion") ||
      url.includes("/chat_conversations") ||
      // Gemini / Google AI Studio
      url.includes("generativelanguage.googleapis.com") ||
      // DeepSeek
      url.includes("chat.deepseek.com") ||
      // Perplexity
      url.includes("perplexity.ai/api") ||
      // Grok
      url.includes("grok.x.ai") ||
      // Copilot / Bing
      url.includes("copilot.microsoft.com")
    );
  }

  // ─── Wrap fetch ──────────────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : "");
    const response = await _fetch.apply(this, args);

    if (!isLLMEndpoint(url)) return response;

    const clone = response.clone();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
      // Streaming: parse each chunk immediately — don't wait for stream end
      const reader = clone.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastIn = 0, lastOut = 0;
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Parse after every chunk — emit as soon as we have new token data
            const { inputTokens, outputTokens } = parseSSEChunks(buffer);
            if ((inputTokens > lastIn) || (outputTokens > lastOut)) {
              lastIn = inputTokens || lastIn;
              lastOut = outputTokens || lastOut;
              emit({ type: "api_tokens", inputTokens: lastIn, outputTokens: lastOut, url });
            }
          }
          // Final pass — ensures accuracy on last chunk
          const { inputTokens, outputTokens } = parseSSEChunks(buffer);
          if ((inputTokens > 0 || outputTokens > 0) &&
              (inputTokens !== lastIn || outputTokens !== lastOut)) {
            emit({ type: "api_tokens", inputTokens, outputTokens, url });
          }
        } catch (_) {}
      })();
    } else {
      // Non-streaming: parse JSON
      clone.json().then(obj => {
        const { inputTokens, outputTokens } = parseJSON(obj);
        if (inputTokens > 0 || outputTokens > 0) {
          emit({ type: "api_tokens", inputTokens, outputTokens, url });
        }
      }).catch(() => {});
    }

    return response;
  };

  // ─── Wrap XHR ────────────────────────────────────────────────────────────
  const _XHROpen = XMLHttpRequest.prototype.open;
  const _XHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__trUrl = url;
    return _XHROpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (isLLMEndpoint(this.__trUrl || "")) {
      this.addEventListener("load", function () {
        try {
          const ct = this.getResponseHeader("content-type") || "";
          let inputTokens = 0, outputTokens = 0;
          if (ct.includes("text/event-stream") || this.responseText.startsWith("data:")) {
            ({ inputTokens, outputTokens } = parseSSEChunks(this.responseText));
          } else {
            const obj = JSON.parse(this.responseText);
            ({ inputTokens, outputTokens } = parseJSON(obj));
          }
          if (inputTokens > 0 || outputTokens > 0) {
            emit({ type: "api_tokens", inputTokens, outputTokens, url: this.__trUrl });
          }
        } catch (_) {}
      });
    }
    return _XHRSend.call(this, body);
  };

})();
