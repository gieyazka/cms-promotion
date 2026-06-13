
let minioClient: Minio.Client | null = null;

export async function uploadToMinio(
    filename: string,
    buffer: Buffer,
    contentType: string
): Promise<void> {
    if (!minioClient) throw new Error("Minio client is not configured");
    await ensureBucket();
    await minioClient.putObject(BUCKET_NAME, filename, buffer, buffer.length, {
        "Content-Type": contentType,
    });
}