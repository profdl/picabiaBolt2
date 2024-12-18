import { supabase } from "../lib/supabase";

export const canvasToFile = async (
  canvas: HTMLCanvasElement
): Promise<File> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob!], "sketchpad.png", { type: "image/png" });
      resolve(file);
    }, "image/png");
  });
};

export const uploadCanvasToSupabase = async (canvas: HTMLCanvasElement) => {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/png");
    });
    const fileName = `sketchpad-${Math.random().toString(36).substring(2)}.png`;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(fileName, blob, {
        contentType: "image/png",
        upsert: false,
      });
    console.log("Blob size:", blob.size, "Blob type:", blob.type);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(fileName);

    await supabase.from("assets").insert([
      {
        url: publicUrl,
        user_id: user.id,
      },
    ]);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadCanvasToSupabase:", error);
    throw error;
  }
};
