import torch
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image

class InpaintPipeline:
    def __init__(self, device="cuda" if torch.cuda.is_available() else "cpu"):
        self.device = device
        print(f"Loading SD Inpainting model on {device}...")

        dtype = torch.float16 if device == "cuda" else torch.float32

        # runwayml/stable-diffusion-inpainting is the canonical inpainting checkpoint
        self.pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=dtype,
            safety_checker=None,
        ).to(self.device)

        if self.device == "cuda":
            self.pipe.enable_attention_slicing()

    def generate(self, image: Image.Image, mask: Image.Image, prompt: str, num_samples: int = 4):
        """
        image : RGB PIL image (source)
        mask  : Grayscale PIL image — WHITE = area to inpaint, BLACK = keep original
        prompt: text describing the desired edit
        """
        image = image.resize((512, 512), Image.Resampling.LANCZOS).convert("RGB")
        mask  = mask.resize((512, 512),  Image.Resampling.LANCZOS).convert("L")

        print(f"Inpainting {num_samples} candidates for: '{prompt}' (Batched)")

        # Generate all samples in a single batch for maximum GPU efficiency
        result_images = self.pipe(
            prompt=prompt,
            image=image,
            mask_image=mask,
            num_inference_steps=20,
            guidance_scale=7.5,
            num_images_per_prompt=num_samples,
        ).images

        return result_images

_pipeline = None
def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = InpaintPipeline()
    return _pipeline
