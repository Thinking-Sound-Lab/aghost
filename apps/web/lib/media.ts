import { createMediaUploadSchema } from "@workspace/api/contract"
import { api } from "@/lib/api"

/** Why the first unsuitable file can't be posted, or null when all can. */
export function fileProblem(files: File[]): string | null {
  for (const file of files) {
    const checked = createMediaUploadSchema.safeParse({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    })
    if (!checked.success)
      return `${file.name}: ${checked.error.issues[0]!.message}`
  }
  return null
}

/**
 * Uploads the files together. The uploaded ones keep the order they were
 * chosen in; `failed` is the first that did not upload.
 */
export async function uploadFiles(files: File[]) {
  const results = await Promise.allSettled(files.map(api.media.upload))
  return {
    media: results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    ),
    failed: results.find((result) => result.status === "rejected"),
  }
}
