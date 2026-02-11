using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace ASP_NanoImageGen.Services
{

    public sealed class GeminiImageService
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly IConfiguration _cfg;

        public GeminiImageService(IHttpClientFactory httpFactory, IConfiguration cfg)
        {
            _httpFactory = httpFactory;
            _cfg = cfg;
        }

        public async Task<GeminiImageResult> GenerateAsync(string prompt, string model, string aspectRatio)
        {
            var apiKey = _cfg["GEMINI_API_KEY"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return new GeminiImageResult(false, 500, null, "GEMINI_API_KEY missing");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    imageConfig = new
                    {
                        aspectRatio = aspectRatio
                    }
                }
            };

            var http = _httpFactory.CreateClient();

            using var msg = new HttpRequestMessage(HttpMethod.Post, url);
            msg.Headers.Add("x-goog-api-key", apiKey);
            msg.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            msg.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var res = await http.SendAsync(msg);
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return new GeminiImageResult(false, (int)res.StatusCode, null, json);

            try
            {
                using var doc = JsonDocument.Parse(json);

                var parts = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts");

                foreach (var p in parts.EnumerateArray())
                {
                    if (p.TryGetProperty("inlineData", out var inlineData) &&
                        inlineData.TryGetProperty("data", out var dataEl))
                    {
                        var b64 = dataEl.GetString();
                        var mime = inlineData.TryGetProperty("mimeType", out var mt) ? mt.GetString() : "image/png";
                        if (string.IsNullOrWhiteSpace(b64)) break;
                        var dataUrl = $"data:{mime};base64,{b64}";
                        return new GeminiImageResult(true, 200, dataUrl, null);
                    }
                }

                return new GeminiImageResult(false, 502, null, "No image returned");
            }
            catch
            {
                return new GeminiImageResult(false, 502, null, "Bad response format");
            }
        }
    }

    public sealed record GeminiImageResult(bool Ok, int StatusCode, string? DataUrl, string? Error);
}
