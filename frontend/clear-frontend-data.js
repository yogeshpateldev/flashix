// Clear all Flashix frontend data from localStorage
console.log('Clearing Flashix frontend data...');

// Clear session data
localStorage.removeItem('flashix_session_id');
localStorage.removeItem('flashix_session_files');
localStorage.removeItem('flashix_session_created');

// Clear auth data
localStorage.removeItem('flashix_token');
localStorage.removeItem('flashix_refresh_token');
localStorage.removeItem('flashix_user');

// Clear any other Flashix-related data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('flashix_')) {
    localStorage.removeItem(key);
    console.log(`Removed: ${key}`);
  }
});

console.log('Frontend data cleared! Refresh the page to see changes.');
console.log('You may also need to clear cookies if you have any session cookies.');
