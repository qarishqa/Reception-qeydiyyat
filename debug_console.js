// Browser console-da işə salmaq üçün kod
// Bu kodu browser console-da copy-paste edin

console.log('=== Customer Debug Console ===');

// Check current customers in database
supabase.from('customers').select('*').then(({ data, error }) => {
  if (error) {
    console.error('Customers fetch error:', error);
  } else {
    console.log('Total customers in DB:', data?.length || 0);
    console.log('Customers:', data);
  }
});

// Check current user and permissions
supabase.auth.getUser().then(({ data: { user }, error }) => {
  if (error) {
    console.error('User error:', error);
    return;
  }
  
  console.log('Current user ID:', user?.id);
  
  if (user) {
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data: profile, error: profileError }) => {
        if (profileError) {
          console.error('Profile error:', profileError);
        } else {
          console.log('User profile:', profile);
          console.log('User role:', profile?.role);
          console.log('Is admin:', profile?.role === 'admin');
        }
      });
  }
});

// Test delete function
window.testDeleteCustomer = async function(customerId) {
  try {
    console.log('=== Testing Delete ===');
    console.log('Attempting to delete customer:', customerId);
    
    // First check if customer exists
    const { data: beforeDelete } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId);
    
    console.log('Customer before delete:', beforeDelete);
    
    // Attempt delete
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) {
      console.error('Delete error:', error);
      return { success: false, error };
    }
    
    // Check if customer still exists
    const { data: afterDelete } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId);
    
    console.log('Customer after delete:', afterDelete);
    console.log('Delete successful:', afterDelete?.length === 0);
    
    return { success: true, stillExists: afterDelete?.length > 0 };
  } catch (err) {
    console.error('Exception during delete:', err);
    return { success: false, error: err };
  }
};

console.log('Debug functions loaded.');
console.log('Use testDeleteCustomer("customer-id") to test deletion.');
console.log('Copy this entire code and paste in browser console.');