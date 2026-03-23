const fs = require('fs');
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function testUpload() {
  console.log('1. Requesting signed url...');
  const urlRes = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section_id: 'test-section',
      page_slug: 'test-slug',
      file_name: 'test.txt',
      file_type: 'text/plain',
      file_size: 15,
    }),
  });
  
  const urlData = await urlRes.json();
  console.log('API response:', urlData);

  if (!urlData.file_path || !urlData.token) {
    console.error('Failed to get signed URL');
    return;
  }

  console.log('2. Uploading file to storage via Supabase JS client...');
  const supabaseBrowser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const testFile = new Blob(['hello world 123'], { type: 'text/plain' });

  const { data, error } = await supabaseBrowser.storage
    .from('uploads')
    .uploadToSignedUrl(urlData.file_path, urlData.token, testFile);

  if (error) {
    console.error('Upload Error:', error);
  } else {
    console.log('Upload Success:', data);
    
    console.log('3. Confirming upload...');
    const confirmRes = await fetch("http://localhost:3000/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: 'test-section',
          file_name: 'test.txt',
          file_path: urlData.file_path,
          file_size: 15,
          edit_token: 'dummy',
          page_slug: 'test-slug',
        }),
      });
      const confirmData = await confirmRes.json();
      console.log('Confirm Response:', confirmData);
  }
}

testUpload();
