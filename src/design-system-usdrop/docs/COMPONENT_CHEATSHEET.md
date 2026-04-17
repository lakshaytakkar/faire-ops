# USDrop AI — Component Cheatsheet

Copy-paste HTML recipes for every component. All classes use `ds-usdrop-` prefix.

## Buttons

```html
<!-- Primary -->
<button class="ds-usdrop-btn ds-usdrop-btn-default ds-usdrop-btn-default-size">Save</button>

<!-- Secondary -->
<button class="ds-usdrop-btn ds-usdrop-btn-secondary ds-usdrop-btn-default-size">Cancel</button>

<!-- Outline -->
<button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-default-size">Export</button>

<!-- Destructive -->
<button class="ds-usdrop-btn ds-usdrop-btn-destructive ds-usdrop-btn-default-size">Delete</button>

<!-- Ghost -->
<button class="ds-usdrop-btn ds-usdrop-btn-ghost ds-usdrop-btn-sm">More</button>

<!-- Link -->
<button class="ds-usdrop-btn ds-usdrop-btn-link">Learn more</button>

<!-- Icon button -->
<button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-icon">
  <svg>...</svg>
</button>
```

## Cards

```html
<!-- Standard card -->
<div class="ds-usdrop-card">
  <div class="ds-usdrop-card-header">
    <div class="ds-usdrop-card-title">Title</div>
    <div class="ds-usdrop-card-description">Description text</div>
    <div class="ds-usdrop-card-action">
      <button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-sm">Action</button>
    </div>
  </div>
  <div class="ds-usdrop-card-content">
    <p>Card content goes here</p>
  </div>
  <div class="ds-usdrop-card-footer">
    <span class="ds-usdrop-body-sm">Footer info</span>
  </div>
</div>

<!-- Metric card -->
<div class="ds-usdrop-metric-card">
  <div class="metric-header">
    <span class="metric-label">Total Categories</span>
    <div class="metric-icon"><svg>...</svg></div>
  </div>
  <div class="metric-value">1,247</div>
  <div class="metric-subtitle">+12% from last month</div>
</div>

<!-- Profile gradient card -->
<div class="ds-usdrop-profile-card">
  <div style="display:flex;align-items:center;gap:1rem;">
    <div class="ds-usdrop-profile-avatar">LT</div>
    <div>
      <h2 class="ds-usdrop-h2" style="color:white">Lakshay Takkar</h2>
      <span class="ds-usdrop-badge ds-usdrop-badge-secondary">Pro</span>
    </div>
  </div>
</div>
```

## Badges

```html
<span class="ds-usdrop-badge ds-usdrop-badge-default">Default</span>
<span class="ds-usdrop-badge ds-usdrop-badge-secondary">Secondary</span>
<span class="ds-usdrop-badge ds-usdrop-badge-destructive">Error</span>
<span class="ds-usdrop-badge ds-usdrop-badge-outline">Outline</span>

<!-- Semantic status -->
<span class="ds-usdrop-badge ds-usdrop-badge-success">Active</span>
<span class="ds-usdrop-badge ds-usdrop-badge-warning">Pending</span>
<span class="ds-usdrop-badge ds-usdrop-badge-info">Review</span>
<span class="ds-usdrop-badge ds-usdrop-badge-error">Failed</span>
```

## Inputs

```html
<!-- Text input -->
<label class="ds-usdrop-label">Email <span class="ds-usdrop-label-required"></span></label>
<input class="ds-usdrop-input" type="email" placeholder="you@example.com" />
<p class="ds-usdrop-helper">We'll never share your email.</p>

<!-- Error state -->
<input class="ds-usdrop-input" aria-invalid="true" />
<p class="ds-usdrop-error-text">This field is required.</p>

<!-- Textarea -->
<textarea class="ds-usdrop-textarea" placeholder="Write something..."></textarea>

<!-- Select -->
<button class="ds-usdrop-select">
  <span>Choose option</span>
  <svg>▼</svg>
</button>

<!-- Checkbox -->
<input type="checkbox" class="ds-usdrop-checkbox" />

<!-- Switch -->
<div class="ds-usdrop-switch" data-state="checked">
  <div class="ds-usdrop-switch-thumb"></div>
</div>
```

## Data Table

```html
<div class="ds-usdrop-table-toolbar">
  <div class="search-section">
    <input class="ds-usdrop-input ds-usdrop-table-search" placeholder="Search..." />
  </div>
  <button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-sm">Filter</button>
  <button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-sm">Export</button>
</div>

<table class="ds-usdrop-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Created</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Item name</td>
      <td><span class="ds-usdrop-badge ds-usdrop-badge-success">Active</span></td>
      <td>Apr 16, 2026</td>
    </tr>
  </tbody>
</table>

<div class="ds-usdrop-table-pagination">
  <span>1-10 of 247</span>
  <div class="page-buttons">
    <button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-icon-sm">←</button>
    <button class="ds-usdrop-btn ds-usdrop-btn-outline ds-usdrop-btn-icon-sm">→</button>
  </div>
</div>
```

## Navigation

```html
<!-- Sidebar -->
<aside class="ds-usdrop-sidebar">
  <div class="ds-usdrop-sidebar-header">
    <img src="/logo.svg" alt="Logo" />
  </div>
  <div class="ds-usdrop-sidebar-group">
    <span class="ds-usdrop-sidebar-group-label">Main</span>
    <a href="/dashboard" class="ds-usdrop-sidebar-item" data-active="true">
      <svg>...</svg> Dashboard
    </a>
    <a href="/products" class="ds-usdrop-sidebar-item">
      <svg>...</svg> Products
    </a>
    <a href="/locked" class="ds-usdrop-sidebar-item locked">
      <svg>...</svg> Premium Feature
    </a>
  </div>
  <div class="ds-usdrop-sidebar-footer">
    <div class="ds-usdrop-sidebar-item">
      <svg>...</svg> Settings
    </div>
  </div>
</aside>

<!-- Topbar -->
<div class="ds-usdrop-topbar">
  <button>☰</button>
  <h1 class="ds-usdrop-h1">Dashboard</h1>
  <div style="margin-left:auto">
    <button class="ds-usdrop-btn ds-usdrop-btn-default ds-usdrop-btn-sm">New Item</button>
  </div>
</div>

<!-- Tabs -->
<div class="ds-usdrop-tabs">
  <button class="ds-usdrop-tab" data-active="true">All</button>
  <button class="ds-usdrop-tab">Active <span class="ds-usdrop-badge ds-usdrop-badge-secondary">12</span></button>
  <button class="ds-usdrop-tab">Archived</button>
</div>
```

## Animations

```html
<!-- Gradient animated text -->
<span class="ds-usdrop-gradient-text">AI-Powered Dropshipping</span>

<!-- Shimmer skeleton -->
<div class="ds-usdrop-shimmer" style="height:200px;border-radius:12px;background:#eee"></div>

<!-- Elevation on hover -->
<div class="ds-usdrop-card ds-usdrop-hover-elevate">
  Hover me for subtle tint overlay
</div>

<!-- Stronger elevation -->
<div class="ds-usdrop-card ds-usdrop-hover-elevate-2">
  Hover me for stronger tint
</div>
```

## Typography

```html
<h1 class="ds-usdrop-h1">Page Title</h1>
<h2 class="ds-usdrop-h2">Section Title</h2>
<h3 class="ds-usdrop-h3">Card Title</h3>
<p class="ds-usdrop-body">Body text at 14px</p>
<p class="ds-usdrop-body-sm">Small body at 12px</p>
<span class="ds-usdrop-eyebrow">Category Label</span>
<span class="ds-usdrop-stat">42,847</span>

<!-- Brand headings (CooperLtBt) -->
<h1 class="ds-usdrop-h1-brand">Premium Heading</h1>
<h2 class="ds-usdrop-h2-brand">Brand Subtitle</h2>
```

## Page Skeleton

```html
<!-- Complete admin page -->
<div class="ds-usdrop-shell">
  <div class="ds-usdrop-shell-sidebar">
    <aside class="ds-usdrop-sidebar">...</aside>
  </div>
  <div class="ds-usdrop-shell-main">
    <div class="ds-usdrop-topbar">...</div>
    <div class="ds-usdrop-shell-content">
      <div class="ds-usdrop-page-header">
        <h1 class="ds-usdrop-page-title">Categories</h1>
        <p class="ds-usdrop-page-subtitle">Organize products into categories</p>
      </div>
      <div class="ds-usdrop-metric-grid">
        <div class="ds-usdrop-metric-card">...</div>
        <div class="ds-usdrop-metric-card">...</div>
        <div class="ds-usdrop-metric-card">...</div>
      </div>
      <div class="ds-usdrop-tabs">...</div>
      <div class="ds-usdrop-data-section">
        <div class="ds-usdrop-table-toolbar">...</div>
        <table class="ds-usdrop-table">...</table>
      </div>
    </div>
  </div>
</div>
```
