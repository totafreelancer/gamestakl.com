"""
Image compression utility for the gaming platform.
Automatically compresses uploaded images to stay under a target file size (default 1MB).
"""
import io
import os
from PIL import Image

# Target max size in bytes (1 MB)
TARGET_MAX_SIZE = 1 * 1024 * 1024  # 1 MB

# Max dimensions (width, height) — images larger than this will be resized
MAX_DIMENSIONS = (1920, 1080)

# Minimum JPEG quality floor
MIN_QUALITY = 40


def compress_image(image_file, target_size=TARGET_MAX_SIZE, max_dimensions=MAX_DIMENSIONS):
    """
    Compress an image file to be under the target size (in bytes).

    Args:
        image_file: A Django UploadedFile or any file-like object with a 'name' attribute.
        target_size: Maximum file size in bytes (default 1MB).
        max_dimensions: Tuple (max_width, max_height) for resizing.

    Returns:
        A BytesIO object containing the compressed image, with the appropriate
        extension set. The caller can wrap this in a ContentFile or InMemoryUploadedFile.
    """
    # Open the image
    img = Image.open(image_file)

    # Convert RGBA/P to RGB for JPEG compatibility
    if img.mode in ('RGBA', 'P'):
        # Preserve transparency for PNG/WebP
        has_transparency = img.mode == 'RGBA' or (img.mode == 'P' and 'transparency' in img.info)
        if not has_transparency:
            img = img.convert('RGB')
    elif img.mode not in ('RGB', 'L'):
        img = img.convert('RGB')

    # Step 1: Resize if dimensions exceed max_dimensions
    original_width, original_height = img.size
    max_w, max_h = max_dimensions

    if original_width > max_w or original_height > max_h:
        # Calculate scaling ratio
        ratio = min(max_w / original_width, max_h / original_height)
        new_width = int(original_width * ratio)
        new_height = int(original_height * ratio)
        img = img.resize((new_width, new_height), Image.LANCZOS)

    # Step 2: Compress with progressive quality reduction
    # Determine output format from the original file extension
    original_name = getattr(image_file, 'name', '') or ''
    ext = os.path.splitext(original_name)[1].lower()

    if ext in ('.jpg', '.jpeg'):
        output_format = 'JPEG'
    elif ext == '.webp':
        output_format = 'WEBP'
    else:
        # Default to JPEG for best compression
        output_format = 'JPEG'
        ext = '.jpg'

    # For non-transparent images, JPEG gives best compression
    if output_format == 'JPEG' and img.mode != 'RGB':
        img = img.convert('RGB')

    quality = 85  # Start with good quality
    output = io.BytesIO()

    while quality >= MIN_QUALITY:
        output.seek(0)
        output.truncate(0)

        save_kwargs = {'format': output_format, 'quality': quality}
        if output_format == 'JPEG':
            save_kwargs['optimize'] = True
            save_kwargs['progressive'] = True
        elif output_format == 'WEBP':
            save_kwargs['method'] = 6  # Best compression

        img.save(output, **save_kwargs)

        if output.tell() <= target_size:
            break

        # Reduce quality and try again
        quality -= 5

    # If still too large at minimum quality, try more aggressive resize
    if output.tell() > target_size and quality <= MIN_QUALITY:
        # Reduce dimensions by 50% and try again
        w, h = img.size
        img = img.resize((w // 2, h // 2), Image.LANCZOS)
        quality = 85

        while quality >= MIN_QUALITY:
            output.seek(0)
            output.truncate(0)

            save_kwargs = {'format': output_format, 'quality': quality}
            if output_format == 'JPEG':
                save_kwargs['optimize'] = True
                save_kwargs['progressive'] = True
            elif output_format == 'WEBP':
                save_kwargs['method'] = 6

            img.save(output, **save_kwargs)

            if output.tell() <= target_size:
                break
            quality -= 5

    output.seek(0)
    output.name = f"compressed_{os.path.splitext(os.path.basename(original_name))[0]}{ext}"
    return output


def compress_image_in_memory(image_file, target_size=TARGET_MAX_SIZE, max_dimensions=MAX_DIMENSIONS):
    """
    Convenience wrapper that returns a Django-compatible InMemoryUploadedFile.
    """
    from django.core.files.uploadedfile import InMemoryUploadedFile

    compressed = compress_image(image_file, target_size, max_dimensions)

    # Determine content type
    ext = os.path.splitext(compressed.name)[1].lower()
    content_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    }
    content_type = content_type_map.get(ext, 'image/jpeg')

    return InMemoryUploadedFile(
        file=compressed,
        field_name='image',
        name=compressed.name,
        content_type=content_type,
        size=compressed.getbuffer().nbytes,
        charset=None,
    )
