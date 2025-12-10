import React, { useEffect, useMemo, useState } from 'react'

const API = 'http://localhost:4000/api'
const BUSINESS_PHONE = '1234567890' // replace with real number in intl format

function whatsappLink(product, variantName = '', qty = 1) {
  const text = `Hello, I would like to order ${qty} unit of the '${product.name}'${variantName?` in the '${variantName}'`:''}. Product Link: ${location.origin}/products/${product.slug}`
  const url = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(text)}`
  return url
}

function StockBadge({ variant }) {
  if (!variant) return null
  const s = variant.stock
  if (s <= 0) return <div className="badge">Sold Out</div>
  if (s <= 3) return <div className="badge">Few pieces remaining</div>
  return <div className="badge">In Stock</div>
}

function Filters({ products, onChange }) {
  const [flavor, setFlavor] = useState('')
  const [price, setPrice] = useState('')
  const [pop, setPop] = useState('')
  const [disc, setDisc] = useState('')
  useEffect(() => { onChange({ flavor, price, pop, disc }) }, [flavor, price, pop, disc])
  const flavors = useMemo(() => Array.from(new Set(products.flatMap(p => p.flavors||[]))), [products])
  return (
    <div className="filters">
      <select value={flavor} onChange={e=>setFlavor(e.target.value)}>
        <option value="">All flavors</option>
        {flavors.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <select value={price} onChange={e=>setPrice(e.target.value)}>
        <option value="">Any price</option>
        <option value="0-25">Under $25</option>
        <option value="25-50">$25 to $50</option>
        <option value="50-100">$50 to $100</option>
      </select>
      <select value={pop} onChange={e=>setPop(e.target.value)}>
        <option value="">Popularity</option>
        <option value="desc">Top rated</option>
      </select>
      <select value={disc} onChange={e=>setDisc(e.target.value)}>
        <option value="">Discounts</option>
        <option value="true">On sale</option>
      </select>
    </div>
  )
}

function ProductCard({ p }) {
  const v = p.variants?.[0]
  const url = whatsappLink(p, v?.name)
  return (
    <div className="card">
      <a href={`#/products/${p.slug}`} aria-label={p.name}>
        <img src={p.imageUrl} alt={p.name} loading="lazy" />
        <div className="price">${p.priceFinal?.toFixed(2) ?? p.price.toFixed(2)}</div>
        <div>{p.name}</div>
      </a>
      <StockBadge variant={v} />
      <a className="btn" href={url} target="_blank" rel="noopener noreferrer">Order via WhatsApp</a>
    </div>
  )
}

function useProducts(filters) {
  const [items, setItems] = useState([])
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.flavor) params.set('flavor', filters.flavor)
    if (filters.price) {
      const [min,max] = filters.price.split('-').map(Number)
      params.set('minPrice', min)
      params.set('maxPrice', max)
    }
    if (filters.pop) params.set('popularity', filters.pop)
    if (filters.disc) params.set('discount', filters.disc)
    fetch(`${API}/products?${params.toString()}`).then(r=>r.json()).then(setItems)
  }, [JSON.stringify(filters)])
  return items
}

function ProductList() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const products = useProducts(filters)
  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="container">
      <div className="hero">
        <input className="search" placeholder="Search products" value={q} onChange={e=>setQ(e.target.value)} />
        <Filters products={products} onChange={setFilters} />
      </div>
      <div className="grid">
        {filtered.map(p => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  )
}

function ProductPage({ slug }) {
  const [p, setP] = useState(null)
  const [variant, setVariant] = useState('')
  const [qty, setQty] = useState(1)
  useEffect(() => { fetch(`${API}/products/${slug}`).then(r=>r.json()).then(setP) }, [slug])
  if (!p) return <div className="container">Loading...</div>
  const url = whatsappLink(p, variant, qty)
  const availability = (()=>{
    const v = p.variants?.find(v=>v.name===variant) || p.variants?.[0]
    const s = v?.stock ?? 0
    return s<=0?'https://schema.org/OutOfStock':'https://schema.org/InStock'
  })()
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    description: p.seo?.description || '',
    image: p.imageUrl,
    sku: p.sku || '',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: (p.priceFinal ?? p.price).toFixed(2),
      availability,
      url: `${location.origin}/#/products/${p.slug}`
    }
  }
  return (
    <div className="container">
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16}}>
        <img src={p.imageUrl} alt={p.name} />
        <div>
          <h1 style={{margin:'8px 0'}}>{p.name}</h1>
          <div className="price">${(p.priceFinal ?? p.price).toFixed(2)}</div>
          <p>{p.seo?.description || ''}</p>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}></script>
          <label>
            Variant
            <select value={variant} onChange={e=>setVariant(e.target.value)}>
              <option value="">Select</option>
              {p.variants?.map(v => <option key={v.name} value={v.name}>{v.name} ({v.stock<=0?'Sold Out':v.stock<=3?'Few left':`${v.stock} in stock`})</option>)}
            </select>
          </label>
          <label style={{marginLeft:8}}>
            Qty
            <input type="number" min="1" value={qty} onChange={e=>setQty(+e.target.value)} style={{width:64, marginLeft:8}} />
          </label>
          <div style={{marginTop:12}}>
            <a className="btn" href={url} target="_blank" rel="noopener noreferrer">Order via WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Router() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const h = () => setHash(location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const m = hash.match(/^#\/products\/(.+)$/)
  if (m) return <ProductPage slug={m[1]} />
  return <ProductList />
}

function Contact() {
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [msg,setMsg] = useState('');
  const href = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(`Hi, I'm ${name} (${phone}). ${msg}`)}`
  return (
    <div className="container" style={{maxWidth:640}}>
      <h1>Contact</h1>
      <input className="search" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="search" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
      <textarea className="search" placeholder="Message" value={msg} onChange={e=>setMsg(e.target.value)} />
      <a className="btn" href={href} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>
    </div>
  )
}

function Admin() {
  const [token,setToken] = useState(localStorage.getItem('token')||'');
  const [login,setLogin] = useState({ username:'admin', password:'admin123' });
  const [products,setProducts] = useState([]);
  const [form,setForm] = useState({ name:'', price:0, slug:'', imageUrl:'', flavors:[], variants:[], category:'', seo:{ title:'', description:'' } });
  const [editing,setEditing] = useState(null);
  const [discounts,setDiscounts] = useState([]);
  const [dForm,setDForm] = useState({ type:'percent', value:0, productIds:[], category:'', active:true, startsAt:'', endsAt:'' });
  useEffect(() => { fetch(`${API}/products`).then(r=>r.json()).then(setProducts) }, [])
  useEffect(() => { fetch(`${API}/discounts`).then(r=>r.json()).then(setDiscounts) }, [])
  const authHeader = token? { 'Authorization': `Bearer ${token}` } : {}
  const submitLogin = async () => {
    const r = await fetch(`${API}/auth/login`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(login) });
    const j = await r.json(); if (j.token){ localStorage.setItem('token', j.token); setToken(j.token) }
  }
  const createProduct = async () => {
    const r = await fetch(`${API}/products`, { method:'POST', headers:{ 'Content-Type':'application/json', ...authHeader }, body: JSON.stringify(form) });
    const j = await r.json(); setProducts(p=>[...p,j])
  }
  const updateProduct = async () => {
    if (!editing) return
    const r = await fetch(`${API}/products/${editing._id}`, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader }, body: JSON.stringify(editing) });
    const j = await r.json(); setProducts(p=>p.map(x=>x._id===j._id?j:x)); setEditing(null)
  }
  const removeProduct = async (id) => {
    await fetch(`${API}/products/${id}`, { method:'DELETE', headers:{ ...authHeader } });
    setProducts(p=>p.filter(x=>x._id!==id))
  }
  const createDiscount = async () => {
    const r = await fetch(`${API}/discounts`, { method:'POST', headers:{ 'Content-Type':'application/json', ...authHeader }, body: JSON.stringify({ ...dForm, startsAt: dForm.startsAt||undefined, endsAt: dForm.endsAt||undefined }) });
    const j = await r.json(); setDiscounts(d=>[...d,j])
  }
  const updateDiscount = async (doc) => {
    const r = await fetch(`${API}/discounts/${doc._id}`, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader }, body: JSON.stringify(doc) });
    const j = await r.json(); setDiscounts(d=>d.map(x=>x._id===j._id?j:x))
  }
  const removeDiscount = async (id) => {
    await fetch(`${API}/discounts/${id}`, { method:'DELETE', headers:{ ...authHeader } });
    setDiscounts(d=>d.filter(x=>x._id!==id))
  }
  return (
    <div className="container" style={{maxWidth:900}}>
      <h1>Admin Panel</h1>
      {!token && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <input className="search" placeholder="Username" value={login.username} onChange={e=>setLogin({...login, username:e.target.value})} />
          <input className="search" placeholder="Password" type="password" value={login.password} onChange={e=>setLogin({...login, password:e.target.value})} />
          <button className="btn" onClick={submitLogin}>Login</button>
        </div>
      )}
      {token && (
        <>
          <h2>Create Product</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <input className="search" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input className="search" placeholder="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} />
            <input className="search" placeholder="Price" type="number" value={form.price} onChange={e=>setForm({...form,price:+e.target.value})} />
            <input className="search" placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} />
            <input className="search" placeholder="Image URL" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} />
            <input className="search" placeholder="Flavors (comma)" value={form.flavors.join(',')} onChange={e=>setForm({...form,flavors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
            <input className="search" placeholder="Variants (name:stock;...)" value={form.variants.map(v=>`${v.name}:${v.stock}`).join(';')} onChange={e=>setForm({...form,variants:e.target.value.split(';').map(s=>{const [n,k]=s.split(':');return n?{name:n.trim(),stock:+(k||0)}:null}).filter(Boolean)})} />
            <input className="search" placeholder="SEO Title" value={form.seo.title} onChange={e=>setForm({...form,seo:{...form.seo,title:e.target.value}})} />
            <input className="search" placeholder="SEO Description" value={form.seo.description} onChange={e=>setForm({...form,seo:{...form.seo,description:e.target.value}})} />
          </div>
          <button className="btn" onClick={createProduct}>Create</button>

          <h2 style={{marginTop:24}}>Products</h2>
          <div className="grid">
            {products.map(p => (
              <div key={p._id||p.id} className="card">
                <div>{p.name}</div>
                <div className="price">${(p.priceFinal ?? p.price).toFixed(2)}</div>
                <button className="btn" onClick={()=>removeProduct(p._id || p.id)}>Delete</button>
                <button className="btn" onClick={()=>setEditing(p)}>Edit</button>
              </div>
            ))}
          </div>
          {editing && (
            <div className="card" style={{marginTop:16}}>
              <h3>Edit Product</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <input className="search" placeholder="Name" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} />
                <input className="search" placeholder="Slug" value={editing.slug} onChange={e=>setEditing({...editing,slug:e.target.value})} />
                <input className="search" placeholder="Price" type="number" value={editing.price} onChange={e=>setEditing({...editing,price:+e.target.value})} />
                <input className="search" placeholder="Category" value={editing.category||''} onChange={e=>setEditing({...editing,category:e.target.value})} />
                <input className="search" placeholder="Image URL" value={editing.imageUrl||''} onChange={e=>setEditing({...editing,imageUrl:e.target.value})} />
                <input className="search" placeholder="Flavors (comma)" value={(editing.flavors||[]).join(',')} onChange={e=>setEditing({...editing,flavors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
                <input className="search" placeholder="Variants (name:stock;...)" value={(editing.variants||[]).map(v=>`${v.name}:${v.stock}`).join(';')} onChange={e=>setEditing({...editing,variants:e.target.value.split(';').map(s=>{const [n,k]=s.split(':');return n?{name:n.trim(),stock:+(k||0)}:null}).filter(Boolean)})} />
                <input className="search" placeholder="SEO Title" value={editing.seo?.title||''} onChange={e=>setEditing({...editing,seo:{...(editing.seo||{}),title:e.target.value}})} />
                <input className="search" placeholder="SEO Description" value={editing.seo?.description||''} onChange={e=>setEditing({...editing,seo:{...(editing.seo||{}),description:e.target.value}})} />
              </div>
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button className="btn" onClick={updateProduct}>Save</button>
                <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
              </div>
            </div>
          )}

          <h2 style={{marginTop:24}}>Discounts</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <select className="search" value={dForm.type} onChange={e=>setDForm({...dForm,type:e.target.value})}>
              <option value="percent">Percent</option>
              <option value="amount">Amount</option>
            </select>
            <input className="search" placeholder="Value" type="number" value={dForm.value} onChange={e=>setDForm({...dForm,value:+e.target.value})} />
            <input className="search" placeholder="Category (optional)" value={dForm.category} onChange={e=>setDForm({...dForm,category:e.target.value})} />
            <input className="search" placeholder="Product IDs (comma)" value={dForm.productIds.join(',')} onChange={e=>setDForm({...dForm,productIds:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
            <input className="search" placeholder="StartsAt (ISO)" value={dForm.startsAt} onChange={e=>setDForm({...dForm,startsAt:e.target.value})} />
            <input className="search" placeholder="EndsAt (ISO)" value={dForm.endsAt} onChange={e=>setDForm({...dForm,endsAt:e.target.value})} />
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={dForm.active} onChange={e=>setDForm({...dForm,active:e.target.checked})} /> Active
            </label>
          </div>
          <button className="btn" onClick={createDiscount}>Create Discount</button>

          <div className="grid" style={{marginTop:16}}>
            {discounts.map(d => (
              <div key={d._id} className="card">
                <div>{d.type} {d.value}{d.type==='percent'?'%':''}</div>
                <div className="badge">Active: {String(d.active)}</div>
                <button className="btn" onClick={()=>removeDiscount(d._id)}>Delete</button>
                <button className="btn" onClick={()=>updateDiscount({ ...d, active: !d.active })}>{d.active?'Disable':'Enable'}</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function App(){
  const [hash, setHash] = useState(location.hash)
  useEffect(() => { const h = () => setHash(location.hash); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [])
  let content = <Router />
  if (hash.startsWith('#/admin')) content = <Admin />
  if (hash.startsWith('#/contact')) content = <Contact />
  return (
    <>
      <header>
        <div className="container nav">
          <a href="#/">Home</a>
          <a href="#/">Shop</a>
          <a href="#/contact">Contact</a>
          <span style={{marginLeft:'auto'}}></span>
          <a href="#/admin">Admin</a>
        </div>
      </header>
      {content}
      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Minimal Shop · Privacy · Terms</div>
      </footer>
    </>
  )
}
