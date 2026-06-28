import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
//  SUPABASE CREDENTIALS
// ============================================================
const SUPABASE_URL = 'https://bbbxgvmlfcdumykiquqt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnhndm1sZmNkdW15a2lxdXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzIzNzEsImV4cCI6MjA5NDg0ODM3MX0.BKQdvUK4j_zjclMUspN1KuxcpWWTQv0dOdgrLvbPqyg'

let supabase = null
let isSupabaseConnected = false
let retryCount = 0
const MAX_RETRIES = 3

try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'dfc-web-app'
      }
    }
  })
  isSupabaseConnected = true
  console.log('✅ Supabase connected')
} catch (e) {
  console.error('❌ Supabase init failed:', e)
}

let products = []
let comments = []
let currentSearchTerm = ''

// ============================================================
//  RETRY FUNCTION
// ============================================================
async function retryOperation(fn, maxRetries = 3, delay = 1000) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.log(`⏳ Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Increase delay for next attempt (exponential backoff)
      delay *= 1.5
    }
  }
  
  throw lastError
}

// ============================================================
//  LOAD LOGO
// ============================================================
async function loadLogo() {
  if (!supabase || !isSupabaseConnected) return

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'logo_url')
      .single()

    if (error) {
      console.log('ℹ️ No logo found')
      return
    }

    if (data && data.value) {
      const img = document.getElementById('brandLogoImg')
      const txt = document.getElementById('brandLogoText')
      
      if (img) {
        img.src = data.value
        img.style.display = 'block'
        img.classList.add('visible')
        img.onerror = function() {
          console.log('⚠️ Logo image failed to load, showing text logo')
          this.style.display = 'none'
          if (txt) txt.style.display = 'block'
        }
      }
      
      if (txt) txt.style.display = 'none'
      
      console.log('✅ Logo loaded')
    }
  } catch (err) {
    console.log('ℹ️ Logo not configured')
  }
}

// ============================================================
//  LOAD PRODUCTS
// ============================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid')
  if (!grid) return

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
      <p style="margin-top:8px;">Loading products...</p>
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#ff8888;">
        <p>⚠️ Database not connected.</p>
        <p style="font-size:0.8rem;color:#888;margin-top:8px;">Please check your internet connection.</p>
        <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#d4af37;color:#000;border:none;border-radius:40px;cursor:pointer;font-weight:600;">Retry</button>
      </div>
    `
    return
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }, MAX_RETRIES)

    products = result || []
    console.log(`✅ Loaded ${products.length} products`)
    
    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">
          <p>No products available yet.</p>
          <p style="font-size:0.8rem;margin-top:4px;">Check back soon!</p>
        </div>
      `
      return
    }

    renderProducts()
  } catch (err) {
    console.error('❌ Error loading products:', err)
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#ff8888;">
        <p>⚠️ Failed to load products.</p>
        <p style="font-size:0.8rem;color:#888;margin-top:8px;">${err.message || 'Network error. Please check your connection.'}</p>
        <button onclick="location.reload()" style="margin-top:12px;padding:8px 20px;background:#d4af37;color:#000;border:none;border-radius:40px;cursor:pointer;font-weight:600;">Retry</button>
      </div>
    `
  }
}

// ============================================================
//  LOAD COMMENTS
// ============================================================
async function loadComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  container.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin"></i> Loading reviews...
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#888;">
        <p>⚠️ Database not connected.</p>
      </div>
    `
    return
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      return data
    }, MAX_RETRIES)

    comments = result || []
    console.log(`✅ Loaded ${comments.length} comments`)
    renderComments()
  } catch (err) {
    console.error('❌ Error loading comments:', err)
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#ff8888;">
        <p>⚠️ Failed to load reviews.</p>
        <p style="font-size:0.8rem;color:#888;margin-top:4px;">${err.message || 'Network error'}</p>
      </div>
    `
  }
}

// ============================================================
//  RENDER PRODUCTS
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
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">
        <p>No products found.</p>
      </div>
    `
    return
  }

  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-image-wrapper">
        <img class="product-img"
          src="${prod.image_url || prod.imageUrl || 'https://placehold.co/400x500/111111/d4af37?text=DFC'}"
          alt="${prod.name || 'Product'}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x500/111111/d4af37?text=DFC'">
        <div class="product-overlay">
          <button class="quick-view-btn" onclick="event.stopPropagation();openProductModalById('${prod.id}')">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
        <div class="product-badge">New</div>
      </div>
      <div class="product-info">
        <div class="product-name">${prod.name || 'Unnamed'}</div>
        <div class="product-price">${prod.price || '₦0'}</div>
        <div class="product-desc-short">${(prod.details || '').substring(0, 70)}</div>
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
//  RENDER COMMENTS
// ============================================================
function renderComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  if (!comments.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#6a5c48;">
        <p>No reviews yet. Be the first!</p>
      </div>
    `
    return
  }

  container.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-text">${c.text || ''}</div>
      <div class="comment-author">
        <div class="comment-initials">${(c.name || 'U')[0].toUpperCase()}</div>
        <div>
          <div class="comment-name">${c.name || 'Anonymous'}</div>
          <div class="comment-date">${c.date || 'recent'}</div>
        </div>
      </div>
    </div>
  `).join('')
}

// ============================================================
//  ADD COMMENT - WITH RETRY AND BETTER ERROR HANDLING
// ============================================================
async function addComment(name, text) {
  const nameTrimmed = name.trim()
  const textTrimmed = text.trim()
  
  if (!nameTrimmed || !textTrimmed) {
    alert('Please enter your name and comment.')
    return
  }

  if (nameTrimmed.length > 50) {
    alert('Name must be 50 characters or less.')
    return
  }

  if (textTrimmed.length > 500) {
    alert('Comment must be 500 characters or less.')
    return
  }

  if (!supabase || !isSupabaseConnected) {
    alert('Database not connected. Please check your internet connection.')
    return
  }

  // Show loading state on button
  const submitBtn = document.getElementById('submitCommentBtn')
  const originalText = submitBtn ? submitBtn.textContent : 'Post Comment'
  if (submitBtn) {
    submitBtn.textContent = '⏳ Posting...'
    submitBtn.disabled = true
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          name: nameTrimmed,
          text: textTrimmed,
          date: new Date().toLocaleDateString(),
          created_at: new Date().toISOString()
        }])
        .select()
      
      if (error) throw error
      return data
    }, MAX_RETRIES, 1500)

    // Success
    console.log('✅ Comment posted successfully')
    await loadComments()
    
    // Clear form
    document.getElementById('commentName').value = ''
    document.getElementById('commentMsg').value = ''
    
    alert('✅ Thank you for your feedback!')
    
  } catch (err) {
    console.error('❌ Error adding comment:', err)
    
    // User-friendly error messages
    let errorMessage = 'Could not post comment. '
    if (err.message && err.message.includes('network')) {
      errorMessage += 'Please check your internet connection.'
    } else if (err.message && err.message.includes('timeout')) {
      errorMessage += 'The request timed out. Please try again.'
    } else if (err.code === '23505') {
      errorMessage = 'You have already posted a comment. Thank you!'
    } else {
      errorMessage += 'Please try again later.'
    }
    
    alert('❌ ' + errorMessage)
  } finally {
    // Restore button
    if (submitBtn) {
      submitBtn.textContent = originalText
      submitBtn.disabled = false
    }
  }
}

// ============================================================
//  SUBSCRIBE
// ============================================================
async function confirmSignup() {
  const emailInput = document.getElementById('signupEmail')
  const email = emailInput ? emailInput.value.trim() : ''

  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.')
    return
  }

  if (!supabase || !isSupabaseConnected) {
    alert('Database not connected. Please check your internet connection.')
    return
  }

  const submitBtn = document.getElementById('confirmSignupBtn')
  const originalText = submitBtn ? submitBtn.textContent : 'Subscribe ✨'
  if (submitBtn) {
    submitBtn.textContent = '⏳ Subscribing...'
    submitBtn.disabled = true
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{ 
          email: email.trim(), 
          created_at: new Date().toISOString() 
        }])
        .select()
      
      if (error) throw error
      return data
    }, MAX_RETRIES, 1500)

    alert('Thank you for subscribing! ✨')
    document.getElementById('signupModal').style.display = 'none'
    if (emailInput) emailInput.value = ''
    
  } catch (err) {
    console.error('❌ Error subscribing:', err)
    
    if (err.code === '23505') {
      alert('You are already subscribed! ✨')
      document.getElementById('signupModal').style.display = 'none'
    } else {
      let errorMessage = 'Subscription failed. '
      if (err.message && err.message.includes('network')) {
        errorMessage += 'Please check your internet connection.'
      } else {
        errorMessage += 'Please try again later.'
      }
      alert('❌ ' + errorMessage)
    }
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText
      submitBtn.disabled = false
    }
  }
}

// ============================================================
//  MODALS
// ============================================================
let currentProduct = null

function openProductModal(product) {
  currentProduct = product
  const modal = document.getElementById('productModal')
  if (!modal) return
  
  const img = document.getElementById('modalImage')
  img.src = product.image_url || product.imageUrl || 'https://placehold.co/400x500/111111/d4af37?text=DFC'
  img.style.objectFit = 'contain'
  img.style.width = '100%'
  img.style.height = 'auto'
  img.style.maxHeight = '55vh'
  
  document.getElementById('modalName').innerText = product.name || ''
  document.getElementById('modalPrice').innerText = product.price || ''
  document.getElementById('modalDetails').innerText = product.details || ''
  modal.style.display = 'flex'
}

function openProductModalById(id) {
  const product = products.find(p => String(p.id) === String(id))
  if (product) openProductModal(product)
}

window.openProductModalById = openProductModalById

function sendWhatsApp() {
  if (!currentProduct) return
  const msg = `Hi! I'm interested in *${currentProduct.name}* (${currentProduct.price}). Let's negotiate! ✨`
  window.open(`https://wa.me/2348068510863?text=${encodeURIComponent(msg)}`, '_blank')
}

// ============================================================
//  SEARCH
// ============================================================
function setupSearch() {
  const input = document.getElementById('searchInput')
  if (input) {
    let searchTimeout
    input.addEventListener('input', e => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        currentSearchTerm = e.target.value
        renderProducts()
      }, 300) // Debounce search
    })
  }
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DFC Website Initializing...')

  setupSearch()

  // Signup
  document.getElementById('signupBtn')?.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('signupModal').style.display = 'flex'
  })

  document.getElementById('mobileSignupBtn')?.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('signupModal').style.display = 'flex'
  })

  document.getElementById('confirmSignupBtn')?.addEventListener('click', confirmSignup)

  // WhatsApp
  document.getElementById('whatsappModalBtn')?.addEventListener('click', sendWhatsApp)

  // Submit comment
  document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
    const name = document.getElementById('commentName')?.value || ''
    const msg = document.getElementById('commentMsg')?.value || ''
    addComment(name, msg)
  })

  // Allow Enter key for comment
  document.getElementById('commentMsg')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const name = document.getElementById('commentName')?.value || ''
      const msg = document.getElementById('commentMsg')?.value || ''
      addComment(name, msg)
    }
  })

  // Load logo FIRST
  await loadLogo()
  
  // Then load data
  await loadProducts()
  await loadComments()

  console.log('✅ DFC Website Ready')
})

// ============================================================
//  NETWORK STATUS - Show alerts when offline
// ============================================================
window.addEventListener('online', () => {
  console.log('🔄 Network reconnected. Refreshing data...')
  loadProducts()
  loadComments()
})

window.addEventListener('offline', () => {
  console.log('⚠️ Network disconnected.')
  document.querySelector('.offline-notice')?.remove()
  
  const notice = document.createElement('div')
  notice.className = 'offline-notice'
  notice.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #330000;
    color: #ff8888;
    padding: 12px 24px;
    border-radius: 40px;
    border: 1px solid #550000;
    z-index: 999;
    font-size: 0.85rem;
    text-align: center;
    max-width: 90%;
  `
  notice.textContent = '⚠️ You are offline. Please check your internet connection.'
  document.body.appendChild(notice)
})
