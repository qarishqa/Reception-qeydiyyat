import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wabjyjcbekuwoslxxjgq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmp5amNiZWt1d29zbHh4amdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MzgwOTIsImV4cCI6MjA3MjExNDA5Mn0.TcaL3PWDOCh52ZDQNCcOs1eyzjoAtudy38PZZFvX0-g'
);

async function checkCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, created_by')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Customers:', data);
  }
}

checkCustomers();