package expo.modules.komasubject

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

// Finds the subject of a photo (person, animal, object) on the device with
// ML Kit and writes it out as a grey PNG mask: white = subject, black = background.
class KomaSubjectModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KomaSubject")

    // Runs off the main thread, so blocking on the ML Kit task is fine.
    AsyncFunction("segment") { input: String, output: String ->
      val photo = decodeUpright(pathOf(input))
        ?: throw CodedException("Could not read the photo")
      val segmenter = SubjectSegmentation.getClient(
        SubjectSegmenterOptions.Builder().enableForegroundConfidenceMask().build()
      )
      try {
        val result = Tasks.await(segmenter.process(InputImage.fromBitmap(photo, 0)))
        val mask = result.foregroundConfidenceMask
          ?: throw CodedException("No subject mask was returned")
        val w = photo.width
        val h = photo.height
        val pixels = IntArray(w * h)
        mask.rewind()
        for (i in pixels.indices) {
          val v = (mask.get().coerceIn(0f, 1f) * 255f).toInt()
          pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }
        val out = Bitmap.createBitmap(pixels, w, h, Bitmap.Config.ARGB_8888)
        FileOutputStream(File(pathOf(output))).use { out.compress(Bitmap.CompressFormat.PNG, 100, it) }
        out.recycle()
      } finally {
        segmenter.close()
        photo.recycle()
      }
    }
  }

  private fun pathOf(uri: String): String =
    if (uri.startsWith("file:")) requireNotNull(Uri.parse(uri).path) else uri

  // The photo at most MAX_SIDE px on its long side, turned the way it is meant
  // to be seen, so the mask lines up with what Skia decodes.
  private fun decodeUpright(path: String): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_SIDE) sample *= 2
    val raw = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
      ?: return null

    val m = Matrix()
    val s = minOf(1f, MAX_SIDE.toFloat() / maxOf(raw.width, raw.height))
    m.postScale(s, s)
    when (ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> m.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> { m.postRotate(90f); m.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> { m.postRotate(270f); m.postScale(-1f, 1f) }
      ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
    }
    if (m.isIdentity) return raw
    val upright = Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, m, true)
    if (upright !== raw) raw.recycle()
    return upright
  }

  companion object {
    private const val MAX_SIDE = 1024
  }
}
