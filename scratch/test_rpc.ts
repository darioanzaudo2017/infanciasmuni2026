import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log('Testing RPC transferir_expediente...');
  const { data, error } = await supabase.rpc('transferir_expediente', {
    p_expediente_id: 0,
    p_spd_destino_id: 0,
    p_motivo: 'test'
  });

  if (error) {
    console.log('RPC Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('The function DOES NOT EXIST in the database.');
    } else {
      console.log('The function exists but returned an error (likely due to invalid IDs or permissions).');
    }
  } else {
    console.log('RPC Success (unexpected with 0 IDs):', data);
  }
}

testRpc();
