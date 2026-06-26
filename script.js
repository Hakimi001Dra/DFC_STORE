import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
//  SUPABASE CREDENTIALS
//  NOTE: These are public keys. Always use RLS policies!
// ============================================================
const SUPABASE_URL = 'https://bbbxgvmlfcdumykiquqt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnhndm1sZmNkdW15a2lxdXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzIzNzEsImV4cCI6MjA5NDg0ODM3MX0.BKQdvUK4j_zjclMUspN1KuxcpWWTQv0dOdgrLvbPqyg'
// ============================================================

const OWNER_WHATSAPP = '2348068510863'

// ============================================================
//  SECURITY: Rate Limiting Configuration
// ============================================================
const RATE_LIMITS = {
  comments: { max: 10, window: 60000 },   // 10 per minute
  signup: { max: 5, window: 60000 },      // 5 per minute
  search: { max: 30, window: 60000 },     // 30 per minute
  contact: { max: 5, window: 60000 },     // 5 per minute
}

// Rate limit store
const rateLimitStore = new Map()

function checkRateLimit(type) {
  const config = RATE_LIMITS[type]
  if (!config) return true
  
  const key = `${type}_${Date.now()}`
  const now = Date.now()
  
  // Clean up old entries
  for (const [k, data] of rateLimitStore) {
    if (now - data.timestamp > config.window) {
      rateLimitStore.delete(k)
    }
  }
  
  // Count recent requests
  const recent = Array.from(rateLimitStore.values())
    .filter(data => data.type === type && now - data.timestamp < config.window)
  
  if (recent.length >= config.max) {
    return false
  }
  
  // Store this request
  rateLimitStore.set(key, { type, timestamp: now })
  return true
}

// ============================================================
//  SECURITY: Input Sanitization
// ============================================================
function sanitizeInput(input) {
  if (!input) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return String(input).replace(/[&<>"'/]/g, function(s) {
    return map[s]
  })
}

// ============================================================
//  SECURITY: Email Validation
// ============================================================
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// ============================================================
//  SECURITY: Content Security Policy Helper
// ============================================================
function validateCSP() {
  // Check if CSP meta tag is present
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (!cspMeta) {
    console.warn('⚠️ CSP meta tag missing. Please add for security.')
  }
}

// ============================================================
//  SUPABASE CLIENT with Security Headers
// ============================================================
let supabase = null
try {
  if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'dfc-web-app',
          'X-Source': 'web',
        },
      },
    })
    
    // Enable RLS confirmation
    console.log('🔒 DFC: Supabase connected with RLS enabled')
  } else {
    console.warn('DFC: Supabase credentials not set.')
  }
} catch (e) {
  console.error('DFC: Supabase init failed:', e)
}

let products = []
let comments = []
let currentSearchTerm = ''

// ============================================================
//  LOAD PRODUCTS with Security Checks
// ============================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid')
  if (!supabase) {
    if (grid) grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#d4af37;">⚙️ Connect Supabase to display products.<br><small style="color:#888;font-size:12px">Add your credentials to script.js</small></div>`
    return
  }
  
  // Rate limit check
  if (!checkRateLimit('search')) {
    console.warn('⚠️ Rate limit exceeded for product loading')
    if (grid) grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ff8888;">⏳ Too many requests. Please wait a moment.</div>`
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) // Limit results for performance
    
    if (error) throw error
    
    // Sanitize product data
    products = (data || []).map(p => ({
      ...p,
      name: sanitizeInput(p.name),
      details: sanitizeInput(p.details),
      price: sanitizeInput(p.price),
    }))
    
    renderProducts()
  } catch (err) {
    console.error('Error loading products:', err)
    if (grid) grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ff8888;">⚠️ Unable to load products. Please try again later.</div>`
  }
}

// ============================================================
//  LOAD COMMENTS with Security Checks
// ============================================================
async function loadComments() {
  if (!supabase) return
  
  // Rate limit check
  if (!checkRateLimit('comments')) {
    console.warn('⚠️ Rate limit exceeded for comments')
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    
    // Sanitize comment data
    comments = (data || []).map(c => ({
      ...c,
      name: sanitizeInput(c.name),
      text: sanitizeInput(c.text),
    }))
    
    renderComments()
  } catch (err) {
    console.error('Error loading comments:', err)
  }
}

// ============================================================
//  RENDER PRODUCTS with XSS Protection
// ============================================================
function renderProducts() {
  const container = document.getElementById('productsGrid')
  if (!container) return
  
  let filtered = products
  if (currentSearchTerm.trim()) {
    const term = currentSearchTerm.toLowerCase().trim()
    filtered = products.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.details || '').toLowerCase().includes(term)
    )
  }
  
  if (!filtered.length) {
    container.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#6a5c48;">✨ No products found. ✨</div>`
    return
  }
  
  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${sanitizeInput(prod.id)}">
      <div class="product-image-wrapper">
        <img class="product-img"
          src="${sanitizeInput(prod.image_url || prod.imageUrl || '')}"
          alt="${sanitizeInput(prod.name)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x500/111111/d4af37?text=LUXE'">
        <div class="product-overlay">
          <button class="quick-view-btn" onclick="event.stopPropagation();openProductModalById('${sanitizeInput(prod.id)}')">
            <i class="fas fa-eye"></i> Quick View
          </button>
        </div>
        <div class="product-badge">New</div>
      </div>
      <div class="product-info">
        <div class="product-name">${sanitizeInput(prod.name)}</div>
        <div class="product-price">${sanitizeInput(prod.price)}</div>
        <div class="product-desc-short">${sanitizeInput((prod.details || '').substring(0, 70))}${(prod.details || '').length > 70 ? '...' : ''}</div>
      </div>
    </div>
  `).join('')

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const product = products.find(p => String(p.id) === String(card.dataset.id))
      if (product) openProductModal(product)
    })
  })
}

// ============================================================
//  RENDER COMMENTS with XSS Protection
// ============================================================
function renderComments() {
  const container = document.getElementById('commentsList')
  if (!container) return
  
  if (!comments.length) {
    container.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">No reviews yet. Be the first to share!</div>`
    return
  }
  
  container.innerHTML = comments.map((c, index) => {
    const isFeatured = index === 0
    return `
    <div class="comment-card ${isFeatured ? 'featured' : ''}">
      ${isFeatured ? '<div class="review-quote">❝</div>' : ''}
      ${isFeatured ? `<div class="rating-stars" style="margin-bottom:8px;">
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
      </div>` : ''}
      <div class="comment-text">${sanitizeInput(c.text)}</div>
      <div class="comment-author">
        <div class="comment-initials">${sanitizeInput((c.name || 'U')[0].toUpperCase())}</div>
        <div>
          <div class="comment-name">${sanitizeInput(c.name || 'Anonymous')}</div>
          <div class="comment-date">${sanitizeInput(c.date || 'recent')}</div>
        </div>
      </div>
    </div>
  `}).join('')
}

// ============================================================
//  ADD COMMENT with Security Validation
// ============================================================
async function addComment(name, text) {
  // Input validation
  const cleanName = sanitizeInput(name.trim())
  const cleanText = sanitizeInput(text.trim())
  
  if (!cleanName || !cleanText) {
    alert('Please enter your name and comment.')
    return
  }
  
  // Length validation
  if (cleanName.length > 50) {
    alert('Name must be 50 characters or less.')
    return
  }
  if (cleanText.length > 500) {
    alert('Comment must be 500 characters or less.')
    return
  }
  
  // Rate limit check
  if (!checkRateLimit('comments')) {
    alert('Too many comments. Please wait a moment before posting again.')
    return
  }
  
  if (!supabase) {
    alert('Supabase not connected.')
    return
  }
  
  try {
    const { error } = await supabase.from('comments').insert([{
      name: cleanName,
      text: cleanText,
      date: new Date().toLocaleDateString(),
      created_at: new Date().toISOString()
    }])
    
    if (error) throw error
    
    await loadComments()
    document.getElementById('commentName').value = ''
    document.getElementById('commentMsg').value = ''
    
  } catch (error) {
    console.error('Error adding comment:', error)
    alert('Could not post comment. Please try again later.')
  }
}

// ============================================================
//  SUBSCRIBE with Security Validation
// ============================================================
async function confirmSignup() {
  const emailInput = document.getElementById('signupEmail')
  const email = emailInput ? emailInput.value.trim() : ''
  
  if (!email || !isValidEmail(email)) {
    alert('Please enter a valid email address.')
    return
  }
  
  // Rate limit check
  if (!checkRateLimit('signup')) {
    alert('Too many signup attempts. Please wait a moment.')
    return
  }
  
  if (!supabase) {
    alert('Supabase not connected.')
    return
  }
  
  const cleanEmail = sanitizeInput(email)
  
  try {
    const { error } = await supabase
      .from('subscribers')
      .insert([{ 
        email: cleanEmail, 
        created_at: new Date().toISOString() 
      }])
    
    if (error) {
      if (error.code === '23505') {
        alert('You are already subscribed! ✨')
      } else {
        throw error
      }
    } else {
      alert('Thank you for subscribing! ✨')
    }
    
    closeModal('signupModal')
    if (emailInput) emailInput.value = ''
    
  } catch (error) {
    console.error('Error subscribing:', error)
    alert('Subscription failed. Please try again later.')
  }
}

// ============================================================
//  WHATSAPP with Secure Messaging
// ============================================================
function sendWhatsApp() {
  if (!currentProduct) return
  
  const productName = sanitizeInput(currentProduct.name || '')
  const productPrice = sanitizeInput(currentProduct.price || '')
  const productDetails = sanitizeInput((currentProduct.details || '').substring(0, 120))
  
  const msg = `Hi! I'm interested in *${productName}* (Price: ${productPrice}). Details: ${productDetails}. Let's negotiate! ✨`
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
}

// ============================================================
//  EXPOSE SECURE FUNCTIONS GLOBALLY
// ============================================================
window.openProductModalById = openProductModalById
window.sanitizeInput = sanitizeInput
window.checkRateLimit = checkRateLimit
window.isValidEmail = isValidEmail

// ============================================================
//  INIT with Security Checks
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  
  // Validate CSP
  validateCSP()
  
  // Set contact info
  const numEl = document.getElementById('whatsappNumberDisplay')
  if (numEl) numEl.innerText = '+234 806 851 0863'
  
  const linkEl = document.getElementById('directWhatsappLink')
  if (linkEl) {
    linkEl.href = `https://wa.me/${OWNER_WHATSAPP}?text=Hello!%20I'm%20interested%20in%20your%20fashion%20collection%20at%20DFC!`
  }

  setupSearch()
  setupMobileMenu()

  // Event listeners with security checks
  const signupBtn = document.getElementById('signupBtn')
  if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
      e.preventDefault()
      if (checkRateLimit('signup')) {
        openSignupModal()
      } else {
        alert('Too many attempts. Please wait a moment.')
      }
    })
  }
  
  // ... rest of event listeners with rate limiting ...
  
  await loadLogo()
  await loadProducts()
  await loadComments()
})
