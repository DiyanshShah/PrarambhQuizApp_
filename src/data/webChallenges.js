export const webChallenges = [
  {
    id: 1,
    title: "Responsive Navigation Bar",
    description: "Create a responsive navigation bar that collapses into a hamburger menu on mobile devices.",
    requirements: [
      "Navigation should be horizontal on desktop",
      "Should collapse into a hamburger menu on screens smaller than 768px",
      "Include at least 4 navigation items",
      "Add hover effects on navigation items",
      "Implement a smooth toggle animation for the mobile menu"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Navigation</title>
</head>
<body>
  <!-- Create your navigation bar here -->
  <nav>
    <!-- Your code here -->
  </nav>
  
  <div class="content">
    <h1>Welcome to My Website</h1>
    <p>This is a sample content area to show how your navigation works with content.</p>
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

/* Add your navigation styles here */

.content {
  padding: 20px;
  text-align: center;
}`,
    jsTemplate: `// Optional JavaScript for toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  // Your JavaScript here
});`,
    expectedResultImage: "https://i.imgur.com/LwCzBEQ.png"
  },
  {
    id: 2,
    title: "Interactive Contact Form",
    description: "Create a styled interactive contact form with client-side validation.",
    requirements: [
      "Include fields for name, email, subject, and message",
      "Apply proper styling with CSS",
      "Implement client-side validation (JS)",
      "Display error messages for invalid inputs",
      "Show a success message when the form is valid"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
</head>
<body>
  <div class="container">
    <h1>Contact Us</h1>
    <!-- Create your form here -->
    <form id="contactForm">
      <!-- Your code here -->
    </form>
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
}

.container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
}

/* Add your form styles here */`,
    jsTemplate: `// Add your validation logic here
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('contactForm');
  
  // Your validation code here
});`,
    expectedResultImage: "https://i.imgur.com/e2JzJIN.png"
  },
  {
    id: 3,
    title: "Image Gallery with Lightbox",
    description: "Create a responsive image gallery with a lightbox feature when images are clicked.",
    requirements: [
      "Display at least 6 images in a grid layout",
      "Make the grid responsive",
      "Implement a lightbox that shows the full image when clicked",
      "Include navigation controls in the lightbox",
      "Add a close button for the lightbox"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Gallery</title>
</head>
<body>
  <div class="container">
    <h1>My Image Gallery</h1>
    <!-- Create your gallery here -->
    <div class="gallery">
      <!-- Your code here -->
    </div>
  </div>
  
  <!-- Lightbox container -->
  <div id="lightbox" class="lightbox">
    <!-- Your lightbox code here -->
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
}

/* Add your gallery and lightbox styles here */`,
    jsTemplate: `// Add your lightbox functionality here
document.addEventListener('DOMContentLoaded', function() {
  // Your JavaScript here
});`,
    expectedResultImage: "https://i.imgur.com/8ZZ7QmD.png"
  }
]; 