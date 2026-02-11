using System.Threading.Tasks;
using ASP_NanoImageGen.Services;
using Microsoft.AspNetCore.Mvc;

namespace ASP_NanoImageGen.Controllers
{
    public sealed class ImageController : Controller
    {
        private readonly GeminiImageService _svc;

        public ImageController(GeminiImageService svc)
        {
            _svc = svc;
        }

        [HttpGet("/")]
        public IActionResult Index()
            => View();

        [HttpPost("/image/generate")]
        public async Task<IActionResult> Generate([FromBody] GenerateReq req)
        {
            if (req is null || string.IsNullOrWhiteSpace(req.Prompt))
                return BadRequest(new { error = "Prompt required" });

            var model = string.IsNullOrWhiteSpace(req.Model) ? "gemini-2.5-flash-image" : req.Model;
            var ratio = string.IsNullOrWhiteSpace(req.AspectRatio) ? "1:1" : req.AspectRatio;

            var result = await _svc.GenerateAsync(req.Prompt.Trim(), model, ratio);
            if (!result.Ok) return StatusCode(result.StatusCode, new { error = result.Error });

            return Ok(new { dataUrl = result.DataUrl });
        }
    }

    public sealed record GenerateReq(string Prompt, string? Model, string? AspectRatio);
}
