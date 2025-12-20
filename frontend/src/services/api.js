import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


// Mock image upload function to handle multiple files
export const uploadImages = async (files) => {
  // In a real app, you would upload the files to a service like S3
  // and return the URLs. For this demo, we'll return placeholders.
  console.log('Simulating image upload for', files.length, 'files...');
  const uploadPromises = files.map((file, index) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const url = `https://via.placeholder.com/150/1976d2/FFFFFF?text=Sunroof+${index + 1}`;
        console.log(`Uploaded ${file.name} to ${url}`);
        resolve(url);
      }, 500 * (index + 1));
    });
  });

  return Promise.all(uploadPromises);
};

export default api;
