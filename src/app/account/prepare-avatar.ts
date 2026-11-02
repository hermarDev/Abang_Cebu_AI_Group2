export async function prepareAvatar(file: File): Promise<File> {
  const image = await createImageBitmap(file);
  try {
    const maximumBytes = 2 * 1024 * 1024;
    const dimensions = [512, 384, 256];
    const qualities = [0.82, 0.68, 0.55];
    for (const maximumDimension of dimensions) {
      const scale = Math.min(1, maximumDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image preparation is unavailable.");
      context.drawImage(image, 0, 0, width, height);
      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (!blob) continue;
        const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
        const extension = Object.hasOwn(extensions, blob.type) ? extensions[blob.type] : null;
        if (!extension) throw new Error("This photo could not be prepared for upload.");
        if (blob.size <= maximumBytes) {
          return new File([blob], `profile-photo.${extension}`, { type: blob.type, lastModified: Date.now() });
        }
      }
    }
  } finally {
    image.close();
  }
  throw new Error("This photo could not be prepared for upload.");
}
