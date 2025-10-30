// Updated admin.js with Firebase v9+ modular SDK, Hall of Fame, and Twitter/X response functionality
class AdminPanel {
  constructor() {
    this.ADMIN_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
    this.database = null;
    this.submissionsRef = null;
    this.halloffameRef = null;
    this.submissionsListener = null;
    this.halloffameListener = null;
    this.firebaseUtils = null;
    this.firebaseReady = false;
    this.currentTab = 'submissions';
    
    this.initializeFirebase();
    this.initializeEventListeners();
  }

  // Initialize Firebase
  async initializeFirebase() {
    try {
      console.log('Initializing Firebase in admin panel...');
      
      // Import Firebase modules
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js");
      const { getDatabase, ref, push, onValue, remove, off, get, set } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js");
      const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js");
      
      // Your Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyB4Cl_2tD57-wqc0Zfsi7QBaf-gkv8yLtc",
        authDomain: "goocubelets.firebaseapp.com",
        databaseURL: "https://goocubelets-default-rtdb.firebaseio.com",
        projectId: "goocubelets",
        storageBucket: "goocubelets.firebasestorage.app",
        messagingSenderId: "838931947059",
        appId: "1:838931947059:web:37755dfe600b8ae5aa4d46",
        measurementId: "G-1PD0BVYFV3"
      };
      
      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      this.database = getDatabase(app);
      const analytics = getAnalytics(app);
      
      // Store Firebase functions
      this.firebaseUtils = {
        ref,
        push,
        onValue,
        remove,
        off,
        get,
        set
      };
      
      this.submissionsRef = ref(this.database, 'submissions');
      this.halloffameRef = ref(this.database, 'halloffame');
      this.firebaseReady = true;
      
      console.log('Firebase initialized successfully in admin panel');
      
      // Test Firebase connection
      this.firebaseUtils.get(this.submissionsRef)
        .then((snapshot) => {
          const data = snapshot.val();
          console.log('Firebase connection test successful. Current data:', data);
        })
        .catch((error) => {
          console.error('Firebase connection test failed:', error);
        });
        
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.firebaseReady = false;
    }
  }

  // Initialize all event listeners
  initializeEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }

  // Tab switching functionality
  showTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeTabBtn = document.querySelector(`[onclick="adminPanel.showTab('${tabName}')"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');
    
    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const activeTabContent = document.getElementById(`${tabName}Tab`);
    if (activeTabContent) activeTabContent.classList.add('active');
    
    // Load appropriate data
    if (tabName === 'submissions') {
      this.loadSubmissions();
    } else if (tabName === 'halloffame') {
      this.loadHallOfFame();
    }
  }

  // SHA-256 hashing function
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // Handle login form submission
  async handleLogin(e) {
    e.preventDefault();
    
    const passwordInput = document.getElementById('password');
    if (!passwordInput) {
      console.error('Password input not found');
      return;
    }
    
    const password = passwordInput.value;
    const passwordHash = await this.sha256(password);
    
    console.log('Login attempt with password hash:', passwordHash);
    
    if (passwordHash === this.ADMIN_PASSWORD_HASH) {
      console.log('Login successful');
      this.showAdminPanel();
    } else {
      console.log('Login failed');
      this.showLoginError();
    }
  }

  // Show admin panel after successful login
  showAdminPanel() {
    const loginContainer = document.getElementById('loginContainer');
    const adminContent = document.getElementById('adminContent');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
    
    console.log('Admin panel shown, loading submissions...');
    this.showTab('submissions'); // Start with submissions tab
    this.setupRealtimeListeners();
  }

  // Show login error message
  showLoginError() {
    const errorMessage = document.getElementById('errorMessage');
    const passwordInput = document.getElementById('password');
    
    if (errorMessage) {
      errorMessage.style.display = 'block';
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 3000);
    }
    
    if (passwordInput) {
      passwordInput.value = '';
    }
  }

  // Logout functionality
  logout() {
    const loginContainer = document.getElementById('loginContainer');
    const adminContent = document.getElementById('adminContent');
    const passwordInput = document.getElementById('password');
    
    if (loginContainer) loginContainer.style.display = 'block';
    if (adminContent) adminContent.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
    
    // Remove the real-time listeners
    if (this.submissionsListener && this.firebaseUtils && this.submissionsRef) {
      this.firebaseUtils.off(this.submissionsRef, 'value', this.submissionsListener);
      this.submissionsListener = null;
    }
    if (this.halloffameListener && this.firebaseUtils && this.halloffameRef) {
      this.firebaseUtils.off(this.halloffameRef, 'value', this.halloffameListener);
      this.halloffameListener = null;
    }
    
    console.log('Logged out');
  }

  // Setup real-time listeners for both submissions and hall of fame
  setupRealtimeListeners() {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot setup real-time listeners');
      return;
    }

    console.log('Setting up real-time listeners...');
    
    // Submissions listener
    this.submissionsListener = this.firebaseUtils.onValue(this.submissionsRef, (snapshot) => {
      console.log('Submissions real-time update received:', snapshot.val());
      if (this.currentTab === 'submissions') {
        this.renderSubmissions(snapshot.val());
      }
    }, (error) => {
      console.error('Submissions real-time listener error:', error);
    });

    // Hall of Fame listener
    this.halloffameListener = this.firebaseUtils.onValue(this.halloffameRef, (snapshot) => {
      console.log('Hall of Fame real-time update received:', snapshot.val());
      if (this.currentTab === 'halloffame') {
        this.renderHallOfFame(snapshot.val());
      }
    }, (error) => {
      console.error('Hall of Fame real-time listener error:', error);
    });
  }

  // Load submissions from Firebase
  loadSubmissions() {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, falling back to localStorage');
      this.loadLocalSubmissions();
      return;
    }

    console.log('Loading submissions from Firebase...');
    
    this.firebaseUtils.get(this.submissionsRef)
      .then((snapshot) => {
        const data = snapshot.val();
        console.log('Loaded submissions from Firebase:', data);
        this.renderSubmissions(data);
      })
      .catch((error) => {
        console.error('Error loading submissions from Firebase:', error);
        this.loadLocalSubmissions();
      });
  }

  // Load Hall of Fame from Firebase
  loadHallOfFame() {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready for Hall of Fame');
      return;
    }

    console.log('Loading Hall of Fame from Firebase...');
    
    this.firebaseUtils.get(this.halloffameRef)
      .then((snapshot) => {
        const data = snapshot.val();
        console.log('Loaded Hall of Fame from Firebase:', data);
        this.renderHallOfFame(data);
      })
      .catch((error) => {
        console.error('Error loading Hall of Fame from Firebase:', error);
        this.renderHallOfFame(null);
      });
  }

  // Fallback to localStorage if Firebase fails
  loadLocalSubmissions() {
    console.log('Loading submissions from localStorage...');
    try {
      let submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
      console.log('Loaded submissions from localStorage:', submissions);
      
      const submissionsObject = {};
      submissions.forEach(submission => {
        submissionsObject[submission.id] = submission;
      });
      this.renderSubmissions(submissionsObject);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.renderSubmissions(null);
    }
  }

  // Render submissions from Firebase data
  renderSubmissions(submissionsData) {
    const submissionsList = document.getElementById('submissionsList');
    const submissionCount = document.getElementById('submissionCount');
    
    if (!submissionsList || !submissionCount) {
      console.error('Submission display elements not found');
      return;
    }
    
    console.log('Rendering submissions:', submissionsData);
    
    if (!submissionsData || Object.keys(submissionsData).length === 0) {
      submissionCount.textContent = '0 submissions';
      submissionsList.innerHTML = '<div class="no-submissions">No submissions yet. Try submitting a question or drawing from the main page first.</div>';
      return;
    }

    // Convert Firebase object to array
    const submissions = Object.entries(submissionsData).map(([firebaseId, submission]) => ({
      ...submission,
      firebaseId: firebaseId
    }));

    console.log('Processed submissions array:', submissions);

    submissionCount.textContent = `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`;
    
    // Sort submissions by timestamp (newest first)
    submissions.sort((a, b) => b.id - a.id);
    
    submissionsList.innerHTML = submissions.map(submission => this.renderSubmission(submission)).join('');
  }

  // Render Hall of Fame from Firebase data
  renderHallOfFame(halloffameData) {
    const halloffameList = document.getElementById('halloffameList');
    const halloffameCount = document.getElementById('halloffameCount');
    
    if (!halloffameList || !halloffameCount) {
      console.error('Hall of Fame display elements not found');
      return;
    }
    
    console.log('Rendering Hall of Fame:', halloffameData);
    
    if (!halloffameData || Object.keys(halloffameData).length === 0) {
      halloffameCount.textContent = '0 featured drawings';
      halloffameList.innerHTML = '<div class="no-submissions">No featured drawings yet.</div>';
      return;
    }

    // Convert Firebase object to array
    const halloffameItems = Object.entries(halloffameData).map(([firebaseId, item]) => ({
      ...item,
      firebaseId: firebaseId
    }));

    console.log('Processed Hall of Fame array:', halloffameItems);

    halloffameCount.textContent = `${halloffameItems.length} featured drawing${halloffameItems.length !== 1 ? 's' : ''}`;
    
    // Sort by when added to hall of fame (newest first)
    halloffameItems.sort((a, b) => b.addedToHallOfFame - a.addedToHallOfFame);
    
    halloffameList.innerHTML = halloffameItems.map(item => this.renderHallOfFameItem(item)).join('');
  }

// Improved createQuestionImage function with IM Fell English font
createQuestionImage(questionText) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match quote2.png dimensions
    canvas.width = 900;
    canvas.height = 675;
    
    // Function to render text (used for both background and fallback)
    const renderText = () => {
      // Define the new text area boundaries with 20px margin
      const textAreaLeft = 82 + 20;
      const textAreaTop = 82 + 20;
      const textAreaRight = 813 - 20;
      const textAreaBottom = 593 - 20;
      const textAreaWidth = textAreaRight - textAreaLeft;
      const textAreaHeight = textAreaBottom - textAreaTop;
      
      // Text styling - white text with IM Fell English font
      ctx.font = 'bold 28px "IM Fell English", serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add text shadow for better readability
      const shadowOffsetX = 2;
      const shadowOffsetY = 2;
      
      // Word wrap the question text
      const words = questionText.split(' ');
      const lines = [];
      let currentLine = '';
      const maxWidth = textAreaWidth;
      
      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Calculate perfect center positioning
      const lineHeight = 35;
      const totalTextHeight = lines.length * lineHeight;
      const textBoxCenterX = (textAreaLeft + textAreaRight) / 2;
      const textBoxCenterY = (textAreaTop + textAreaBottom) / 2;
      const startY = textBoxCenterY - (totalTextHeight / 2) + (lineHeight / 2);
      
      // Draw text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      lines.forEach((line, index) => {
        ctx.fillText(line, textBoxCenterX + shadowOffsetX, startY + (index * lineHeight) + shadowOffsetY);
      });
      
      // Draw main text in white
      ctx.fillStyle = 'white';
      lines.forEach((line, index) => {
        ctx.fillText(line, textBoxCenterX, startY + (index * lineHeight));
      });
      
      // Add site branding at bottom with IM Fell English font
      ctx.font = 'italic 18px "IM Fell English", serif';
      const brandingY = textAreaBottom - 10;
      
      // Draw branding shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText('goocubelets.github.io', textBoxCenterX + shadowOffsetX, brandingY + shadowOffsetY);
      
      // Draw branding text in white
      ctx.fillStyle = 'white';
      ctx.fillText('goocubelets.github.io', textBoxCenterX, brandingY);
    };
    
    // Load the quote2.png background image
    const backgroundImg = new Image();
    
    // Set a timeout to prevent hanging on slow/failed image loads
    const imageTimeout = setTimeout(() => {
      console.warn('Image loading timeout, using fallback background');
      createFallbackAndResolve();
    }, 5000); // 5 second timeout
    
    const createFallbackAndResolve = () => {
      // Clear any existing content
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a dark gradient background as fallback (to work with white text)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#2c3e50');
      gradient.addColorStop(1, '#34495e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a subtle border
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      
      // Render text
      renderText();
      
      // Convert to blob and resolve
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 0.9);
    };
    
    backgroundImg.onload = () => {
      clearTimeout(imageTimeout);
      try {
        // Draw the background image
        ctx.drawImage(backgroundImg, 0, 0, 900, 675);
        
        // Render text on top
        renderText();
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.9);
      } catch (error) {
        console.error('Error drawing image:', error);
        createFallbackAndResolve();
      }
    };
    
    backgroundImg.onerror = () => {
      clearTimeout(imageTimeout);
      console.error('Failed to load quote2.png background image');
      createFallbackAndResolve();
    };
    
    // Try to load the image
    // Use relative path for GitHub Pages compatibility
    backgroundImg.crossOrigin = 'anonymous';
    backgroundImg.src = './quote2.png'; // Using quote2.png instead
  });
}

  // Generate Twitter/X post for question
 // Generate Twitter/X post for question with download/copy options
async generateTwitterPost(firebaseId, questionText) {
  try {
    console.log('Generating Twitter post for question:', questionText);

    // Create image blob
    const imageBlob = await this.createQuestionImage(questionText);

    // Create object URL
    const imageUrl = URL.createObjectURL(imageBlob);

    // Store imageBlob for clipboard use
    this.lastImageBlob = imageBlob;

    // Prepare tweet text
    const tweetText = `Answering an anonymous question from my site! 🤔✨\n\ngoocubelets.github.io`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    // Show modal with both options
    this.showTwitterModalWithOptions(twitterUrl, questionText, imageUrl, imageBlob);

  } catch (error) {
    console.error('Error generating Twitter post:', error);
    alert('Error generating Twitter post. Please try again.');
  }
}

// Modal with both Copy and Download options
showTwitterModalWithOptions(twitterUrl, questionText, imageUrl, imageBlob) {
  const existingModal = document.getElementById('twitterModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'twitterModal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex; justify-content: center; align-items: center;
    z-index: 10000;
    font-family: 'IM Fell English', serif;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    max-width: 520px;
    width: 90%;
    text-align: center;
    font-family: 'IM Fell English', serif;
  `;

  modalContent.innerHTML = `
    <h3 style="color: #1da1f2; font-family: 'IM Fell English', serif;">📱 Post to Twitter/X</h3>
    <p style="font-family: 'IM Fell English', serif;">
      Choose how you'd like to share this image:<br><br>
    </p>
    <div style="margin: 10px 0;">
      <button id="downloadBtn" style="margin: 5px; background: #28a745; color: white; padding: 10px 15px; border: none; border-radius: 5px; font-family: 'IM Fell English', serif;">
        💾 Download Image
      </button>
      <button id="copyBtn" style="margin: 5px; background: #ffc107; color: black; padding: 10px 15px; border: none; border-radius: 5px; font-family: 'IM Fell English', serif;">
        📋 Copy to Clipboard
      </button>
    </div>
    <div style="background: #f8f9fa; padding: 10px; margin: 15px 0; border-radius: 5px; font-family: 'IM Fell English', serif;">
      "${questionText}"
    </div>
    <div>
      <button onclick="window.open('${twitterUrl}', '_blank')" 
              style="background: #1da1f2; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-weight: bold; font-family: 'IM Fell English', serif;">
        🐦 Open Twitter
      </button>
      <button onclick="document.getElementById('twitterModal').remove()" 
              style="margin-left: 10px; background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-family: 'IM Fell English', serif;">
        Close
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Setup download
  document.getElementById('downloadBtn').onclick = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `question-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Setup copy to clipboard
  document.getElementById('copyBtn').onclick = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": imageBlob })
      ]);
      alert('Image copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('Clipboard copy failed. Try manually downloading.');
    }
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

  // Show Twitter posting modal with instructions
  showTwitterModal(twitterUrl, questionText) {
    // Remove existing modal if present
    const existingModal = document.getElementById('twitterModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'twitterModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'IM Fell English', serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      font-family: 'IM Fell English', serif;
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin-bottom: 20px; color: #1da1f2; font-family: 'IM Fell English', serif;">📱 Post to Twitter/X</h3>
      <p style="margin-bottom: 20px; line-height: 1.5; font-family: 'IM Fell English', serif;">
        <strong>Steps to post:</strong><br>
        1. The question image has been downloaded to your computer<br>
        2. Click "Open Twitter" below to open the compose window<br>
        3. Attach the downloaded image to your tweet<br>
        4. Post your response!
      </p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; font-style: italic; font-family: 'IM Fell English', serif;">
        "${questionText}"
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="window.open('${twitterUrl}', '_blank')" 
                style="background: #1da1f2; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-family: 'IM Fell English', serif;">
          🐦 Open Twitter
        </button>
        <button onclick="document.getElementById('twitterModal').remove()" 
                style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-family: 'IM Fell English', serif;">
          Close
        </button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Render individual submission
  renderSubmission(submission) {
    let contentHtml = '';
    
    if (submission.type === 'question') {
      contentHtml = `
        <div class="submission-content">
          <div class="submission-text">${this.escapeHtml(submission.content)}</div>
        </div>
      `;
    } else if (submission.type === 'drawing') {
      contentHtml = `
        <div class="submission-content">
          <div class="submission-drawing">
            <img src="${submission.drawing}" alt="User drawing">
          </div>
          ${submission.content ? `<div class="submission-text">${this.escapeHtml(submission.content)}</div>` : ''}
        </div>
      `;
    }
    
    // Add Twitter button for questions and "Add to Hall of Fame" button for drawings
    const actionButtons = submission.type === 'question' ? 
      `<button class="twitter-btn" onclick="adminPanel.generateTwitterPost('${submission.firebaseId}', '${this.escapeHtml(submission.content).replace(/'/g, '\\\'').replace(/"/g, '&quot;')}')">📱 Post to X</button>` :
      `<button class="halloffame-btn" onclick="adminPanel.addToHallOfFame('${submission.firebaseId}')">Add to Hall of Fame</button>`;
    
    return `
      <div class="submission-item">
        <div class="submission-header">
          <div>
            <span class="submission-type ${submission.type}">${submission.type}</span>
          </div>
          <div>
            <span class="submission-timestamp">${submission.timestamp}</span>
            ${actionButtons}
            <button class="delete-btn" onclick="adminPanel.deleteSubmission('${submission.firebaseId}')">Delete</button>
          </div>
        </div>
        ${contentHtml}
      </div>
    `;
  }

  // Render individual Hall of Fame item
  renderHallOfFameItem(item) {
    return `
      <div class="submission-item">
        <div class="submission-header">
          <div>
            <span class="submission-type drawing">featured drawing</span>
          </div>
          <div>
            <span class="submission-timestamp">Added: ${new Date(item.addedToHallOfFame).toLocaleString()}</span>
            <button class="delete-btn" onclick="adminPanel.removeFromHallOfFame('${item.firebaseId}')">Remove</button>
          </div>
        </div>
        <div class="submission-content">
          <div class="submission-drawing">
            <img src="${item.drawing}" alt="Featured drawing">
          </div>
          ${item.content ? `<div class="submission-text">${this.escapeHtml(item.content)}</div>` : ''}
          <div class="submission-text"><strong>Original submission:</strong> ${item.timestamp}</div>
        </div>
      </div>
    `;
  }

  // Add drawing to Hall of Fame
  addToHallOfFame(firebaseId) {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot add to Hall of Fame');
      return;
    }

    console.log('Adding to Hall of Fame:', firebaseId);
    
    // First, get the submission data
    const submissionRef = this.firebaseUtils.ref(this.database, `submissions/${firebaseId}`);
    this.firebaseUtils.get(submissionRef)
      .then((snapshot) => {
        const submission = snapshot.val();
        if (!submission) {
          alert('Submission not found');
          return;
        }
        
        if (submission.type !== 'drawing') {
          alert('Only drawings can be added to Hall of Fame');
          return;
        }
        
        // Create hall of fame entry
        const hallOfFameEntry = {
          ...submission,
          addedToHallOfFame: Date.now(),
          originalSubmissionId: firebaseId
        };
        
        // Add to hall of fame
        const hallOfFameRef = this.firebaseUtils.ref(this.database, `halloffame/${firebaseId}`);
        return this.firebaseUtils.set(hallOfFameRef, hallOfFameEntry);
      })
      .then(() => {
        console.log('Successfully added to Hall of Fame');
        alert('Drawing added to Hall of Fame!');
      })
      .catch((error) => {
        console.error('Error adding to Hall of Fame:', error);
        alert('Error adding to Hall of Fame. Please try again.');
      });
  }

  // Remove drawing from Hall of Fame
  removeFromHallOfFame(firebaseId) {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot remove from Hall of Fame');
      return;
    }

    if (confirm('Are you sure you want to remove this drawing from Hall of Fame?')) {
      console.log('Removing from Hall of Fame:', firebaseId);
      
      const hallOfFameRef = this.firebaseUtils.ref(this.database, `halloffame/${firebaseId}`);
      this.firebaseUtils.remove(hallOfFameRef)
        .then(() => {
          console.log('Successfully removed from Hall of Fame');
        })
        .catch((error) => {
          console.error('Error removing from Hall of Fame:', error);
          alert('Error removing from Hall of Fame. Please try again.');
        });
    }
  }

  // Delete individual submission from Firebase
  deleteSubmission(firebaseId) {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot delete submission');
      return;
    }

    if (confirm('Are you sure you want to delete this submission?')) {
      console.log('Deleting submission:', firebaseId);
      
      const submissionRef = this.firebaseUtils.ref(this.database, `submissions/${firebaseId}`);
      this.firebaseUtils.remove(submissionRef)
        .then(() => {
          console.log('Submission deleted from Firebase');
          
          // Also remove from hall of fame if it exists there
          const hallOfFameRef = this.firebaseUtils.ref(this.database, `halloffame/${firebaseId}`);
          return this.firebaseUtils.remove(hallOfFameRef);
        })
        .then(() => {
          console.log('Also removed from Hall of Fame if it existed there');
        })
        .catch((error) => {
          console.error('Error deleting submission:', error);
          alert('Error deleting submission. Please try again.');
        });
    }
  }

  // Clear all submissions from Firebase
  clearAllSubmissions() {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot clear submissions');
      return;
    }

    if (confirm('Are you sure you want to delete ALL submissions? This cannot be undone.')) {
      console.log('Clearing all submissions...');
      
      this.firebaseUtils.remove(this.submissionsRef)
        .then(() => {
          console.log('All submissions deleted from Firebase');
        })
        .catch((error) => {
          console.error('Error clearing submissions:', error);
          alert('Error clearing submissions. Please try again.');
        });
    }
  }

  // Clear all Hall of Fame entries
  clearAllHallOfFame() {
    if (!this.firebaseReady || !this.database || !this.firebaseUtils) {
      console.error('Firebase not ready, cannot clear Hall of Fame');
      return;
    }

    if (confirm('Are you sure you want to delete ALL Hall of Fame entries? This cannot be undone.')) {
      console.log('Clearing all Hall of Fame entries...');
      
      this.firebaseUtils.remove(this.halloffameRef)
        .then(() => {
          console.log('All Hall of Fame entries deleted from Firebase');
        })
        .catch((error) => {
          console.error('Error clearing Hall of Fame:', error);
          alert('Error clearing Hall of Fame. Please try again.');
        });
    }
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Debug method to check status
  checkStatus() {
    console.log('Firebase Ready:', this.firebaseReady);
    console.log('Database:', this.database);
    console.log('Firebase Utils:', this.firebaseUtils);
    console.log('Submissions Ref:', this.submissionsRef);
    console.log('Hall of Fame Ref:', this.halloffameRef);
    console.log('Current Tab:', this.currentTab);
  }
}

// Initialize admin panel
const adminPanel = new AdminPanel();

// Global functions for onclick handlers
function logout() {
  adminPanel.logout();
}

function clearAllSubmissions() {
  adminPanel.clearAllSubmissions();
}

function clearAllHallOfFame() {
  adminPanel.clearAllHallOfFame();
}

// Debug function
window.checkAdminStatus = function() {
  adminPanel.checkStatus();
};

// Add some debugging on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin panel DOM loaded');
  setTimeout(() => {
    console.log('Checking admin status after 2 seconds...');
    adminPanel.checkStatus();
  }, 2000);
});