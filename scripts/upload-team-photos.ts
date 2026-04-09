import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "images";

const photos: { file: string; memberName: string }[] = [
  { file: "lakshay.png", memberName: "Lakshay" },
  { file: "shantanu.png", memberName: "Shantanu" },
  { file: "yash_jain.png", memberName: "Yash Jain" },
];

async function main() {
  for (const { file, memberName } of photos) {
    const filePath = path.resolve(__dirname, "..", ".claude", file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `team/${file}`;

    // Upload (upsert) to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload failed for ${file}:`, uploadError.message);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`Uploaded ${file} → ${publicUrl}`);

    // Update team_members table
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ avatar_url: publicUrl })
      .eq("name", memberName);

    if (updateError) {
      console.error(`DB update failed for ${memberName}:`, updateError.message);
    } else {
      console.log(`Updated avatar_url for ${memberName}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
