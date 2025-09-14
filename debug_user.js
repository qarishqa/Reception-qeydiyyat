// Browser console-da işə salmaq üçün kod
// Bu kodu browser console-da copy-paste edin

console.log('=== User Profile Debug ===');

// Get current user from Supabase
supabase.auth.getUser().then(({ data: { user }, error }) => {
  if (error) {
    console.error('User error:', error);
    return;
  }
  
  console.log('Current user ID:', user?.id);
  
  if (user) {
    // Get user profile
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
        
        // Get sample customers to check created_by
        supabase
          .from('customers')
          .select('id, full_name, created_by')
          .limit(5)
          .then(({ data: customers, error: customersError }) => {
            if (customersError) {
              console.error('Customers error:', customersError);
            } else {
              console.log('Sample customers:', customers);
              customers?.forEach(customer => {
                const canDelete = customer.created_by === user.id || profile?.role === 'admin';
                console.log(`Customer "${customer.full_name}": created_by=${customer.created_by}, current_user=${user.id}, can_delete=${canDelete}`);
              });
            }
          });
      });
  }
});

console.log('=== Test Customer Delete ===');
// Test delete function
window.testDeleteCustomer = async function(customerId) {
  try {
    console.log('Attempting to delete customer:', customerId);
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) {
      console.error('Delete error:', error);
      return { success: false, error };
    } else {
      console.log('Delete successful!');
      return { success: true };
    }
  } catch (err) {
    console.error('Exception during delete:', err);
    return { success: false, error: err };
  }
};

console.log('Debug functions loaded. Use testDeleteCustomer("customer-id") to test deletion.');