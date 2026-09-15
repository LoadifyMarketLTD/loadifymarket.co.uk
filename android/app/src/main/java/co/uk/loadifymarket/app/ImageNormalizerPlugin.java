package co.uk.loadifymarket.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;

import androidx.exifinterface.media.ExifInterface;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "ImageNormalizer")
public class ImageNormalizerPlugin extends Plugin {
    private InputStream openImageStream(ContentResolver resolver, Uri uri, String originalValue) throws Exception {
        if (uri.getScheme() == null || uri.getScheme().isEmpty()) {
            return new FileInputStream(new File(originalValue));
        }
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            return new FileInputStream(new File(uri.getPath()));
        }
        InputStream stream = resolver.openInputStream(uri);
        if (stream == null) throw new IllegalStateException("Android returned an unreadable image stream.");
        return stream;
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void normalize(PluginCall call) {
        String uriValue = call.getString("uri");
        int maxDimension = call.getInt("maxDimension", 2048);
        int minDimension = call.getInt("minDimension", 600);
        int quality = call.getInt("quality", 82);
        if (uriValue == null || uriValue.trim().isEmpty()) {
            call.reject("Image URI is missing.", "IMAGE_URI_MISSING");
            return;
        }
        try {
            Uri uri = Uri.parse(uriValue);
            ContentResolver resolver = getContext().getContentResolver();
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream stream = openImageStream(resolver, uri, uriValue)) {
                BitmapFactory.decodeStream(stream, null, bounds);
            }
            if (bounds.outWidth < minDimension || bounds.outHeight < minDimension) {
                call.reject("Image dimensions are too small.", "IMAGE_TOO_SMALL");
                return;
            }

            int sampleSize = 1;
            while (Math.max(bounds.outWidth / sampleSize, bounds.outHeight / sampleSize) > maxDimension * 2) {
                sampleSize *= 2;
            }
            BitmapFactory.Options decode = new BitmapFactory.Options();
            decode.inSampleSize = sampleSize;
            decode.inPreferredConfig = Bitmap.Config.ARGB_8888;
            Bitmap bitmap;
            try (InputStream stream = openImageStream(resolver, uri, uriValue)) {
                bitmap = BitmapFactory.decodeStream(stream, null, decode);
            }
            if (bitmap == null) {
                call.reject("Android could not decode this image.", "IMAGE_DECODE_FAILED");
                return;
            }
            int orientation = ExifInterface.ORIENTATION_NORMAL;
            try (InputStream stream = openImageStream(resolver, uri, uriValue)) {
                if (stream != null) {
                    orientation = new ExifInterface(stream).getAttributeInt(
                        ExifInterface.TAG_ORIENTATION,
                        ExifInterface.ORIENTATION_NORMAL
                    );
                }
            } catch (Exception ignored) {
                // Some content providers do not expose EXIF. Continue without rotation.
            }

            Matrix matrix = new Matrix();
            if (orientation == ExifInterface.ORIENTATION_ROTATE_90) matrix.postRotate(90);
            else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) matrix.postRotate(180);
            else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) matrix.postRotate(270);
            if (!matrix.isIdentity()) {
                Bitmap rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
                if (rotated != bitmap) bitmap.recycle();
                bitmap = rotated;
            }

            float scale = Math.min(1f, (float) maxDimension / Math.max(bitmap.getWidth(), bitmap.getHeight()));
            int width = Math.max(1, Math.round(bitmap.getWidth() * scale));
            int height = Math.max(1, Math.round(bitmap.getHeight() * scale));
            if (width != bitmap.getWidth() || height != bitmap.getHeight()) {
                Bitmap scaled = Bitmap.createScaledBitmap(bitmap, width, height, true);
                if (scaled != bitmap) bitmap.recycle();
                bitmap = scaled;
            }

            Bitmap jpegBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas jpegCanvas = new Canvas(jpegBitmap);
            jpegCanvas.drawColor(Color.WHITE);
            jpegCanvas.drawBitmap(bitmap, 0f, 0f, null);
            bitmap.recycle();

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!jpegBitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)) {
                jpegBitmap.recycle();
                call.reject("Image conversion failed.", "IMAGE_ENCODE_FAILED");
                return;
            }
            jpegBitmap.recycle();
            byte[] bytes = output.toByteArray();
            JSObject result = new JSObject();
            result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            result.put("width", width);
            result.put("height", height);
            result.put("size", bytes.length);
            call.resolve(result);
        } catch (OutOfMemoryError error) {
            call.reject("The image is too large for available device memory.", "IMAGE_LOW_MEMORY");
        } catch (SecurityException error) {
            call.reject("Access to this image was denied.", "IMAGE_PERMISSION_DENIED");
        } catch (Exception error) {
            call.reject("The selected image could not be processed.", "IMAGE_PROCESSING_FAILED", error);
        }
    }
}
