import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 810, "CampusMart Platform — Master Admin Editor Manual & Page Lifecycle Guide")
            self.drawRightString(A4[0] - 36, 810, "CONFIDENTIAL & PROPRIETARY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 804, A4[0] - 36, 804)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 45, A4[0] - 36, 45)
        self.drawString(36, 32, "CampusMart System Administration • campusmart.in")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 32, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom Palettes
    navy_dark = colors.HexColor("#002A6C")
    navy_light = colors.HexColor("#0F3C8A")
    gold_accent = colors.HexColor("#D97706")
    slate_dark = colors.HexColor("#0F172A")
    slate_body = colors.HexColor("#334155")
    slate_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")
    tag_bg = colors.HexColor("#EFF6FF")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=navy_dark,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=gold_accent,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionHeading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=navy_dark,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionHeading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=navy_light,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=slate_body,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=slate_dark
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E3A8A")
    )

    th_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=slate_dark
    )

    td_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=navy_dark
    )

    td_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # Title Banner Block
    story.append(Paragraph("CampusMart Platform — Master Admin Editor Manual", title_style))
    story.append(Paragraph("Page-by-Page Lifecycle, Functional Field Directory & Category Architecture Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=navy_dark, spaceBefore=0, spaceAfter=8))

    intro_p = Paragraph(
        "<b>Audience & Purpose:</b> Definitive operations manual for CampusMart portal administrators and content managers. "
        "Details exact workflows, full field directories, expected data inputs, and public storefront reflection across all functional pages. "
        "Simple static/text stubs (e.g. How It Works, Policies) are excluded to maintain strict focus on active, dynamic editor systems.",
        body_style
    )
    story.append(intro_p)
    story.append(Spacer(1, 6))

    # Architecture Summary Table
    arch_data = [
        [Paragraph("Editor Engine Module", th_style), Paragraph("Admin Panel Route", th_style), Paragraph("Public Storefront Pages Powered", th_style)],
        [Paragraph("1. Product Inventory", td_bold), Paragraph("/admin/products", td_code), Paragraph("/shop, /product/:slug, /product-catalog, /my-account (Wishlist), /request-quote", td_style)],
        [Paragraph("2. Categories & Taxonomy Hub", td_bold), Paragraph("/admin/categories (?mode=...)", td_code), Paragraph("Global Category Bar, Search Dropdowns, Showcase Page Filters, /furniture Sub-cats", td_style)],
        [Paragraph("3. Unified CMS Engine", td_bold), Paragraph("/admin/pages<br/>/admin/pages/:slug", td_code), Paragraph("Solution Hubs (/labs, /sports-infra), Service Suites (/campus-design-execution), Knowledge Hubs (/ai-guide)", td_style)],
        [Paragraph("4. Homepage Content Editor", td_bold), Paragraph("/admin/homepage-editor", td_code), Paragraph("/ (Homepage Sliders, Search Decision Engine, Tickers, Feature Cards, Services, Sidebar)", td_style)],
        [Paragraph("5. Institutional M&A Directory", td_bold), Paragraph("/admin/colleges", td_code), Paragraph("/colleges-universities-for-sale (Directory, NDA Gating, Valuation Ledgers, Dossier Modal)", td_style)],
        [Paragraph("6. AI Solutions Finder", td_bold), Paragraph("/admin/solutions-finder", td_code), Paragraph("/find-solutions (NLP Requirement Briefs, Turnkey Packages, Consultation Intake)", td_style)],
        [Paragraph("7. Institutional Classifieds", td_bold), Paragraph("/admin/classifieds", td_code), Paragraph("/classifieds (Opportunity Board, Dual Enquiry & Post Ad Modals)", td_style)],
        [Paragraph("8. Catalogues & Case Studies", td_bold), Paragraph("/admin/catalogues", td_code), Paragraph("/catalogues (Dual PDF Download/Request Modal), /case-studies/:slug (Media Player)", td_style)],
    ]
    t_arch = Table(arch_data, colWidths=[120, 115, 285])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 10))

    # MODULE 1: Product Inventory
    story.append(Paragraph("MODULE 1: E-Commerce Storefront & Product Inventory Lifecycle", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/products</font> &nbsp;|&nbsp; <b>Storefront Targets:</b> /shop, /product/:slug, /furniture, /request-quote", body_style))
    story.append(Paragraph(
        "<b>Workflow Lifecycle:</b> Navigate to <code>/admin/products</code> &rarr; Click blue <b>'+ Add New Product'</b> &rarr; Complete all 9 catalog fields &rarr; Click <b>'Sync with Database'</b>. The product is instantly published and live on <code>/shop</code> and <code>/product/&lt;slug&gt;</code> without requiring a server reboot.",
        body_style
    ))

    prod_fields = [
        [Paragraph("Field Label in UI", th_style), Paragraph("Input Type", th_style), Paragraph("Input Description & Formatting Rules", th_style), Paragraph("Public Storefront Impact", th_style)],
        [Paragraph("Product Name *", td_bold), Paragraph("Text Input", td_style), Paragraph("Full institutional title (e.g. Ergonomic Student Desk & Chair Combo).", td_style), Paragraph("Title on /shop card, H1 header on /product/:slug, item name in quote.", td_style)],
        [Paragraph("Product Narrative", td_bold), Paragraph("Textarea", td_style), Paragraph("2–3 sentences explaining ergonomics, build materials, warranty, and grade.", td_style), Paragraph("Card summary on /shop and main description on /product/:slug.", td_style)],
        [Paragraph("Listing Price (₹) *", td_bold), Paragraph("Number Input", td_style), Paragraph("Base unit price in Indian Rupees (e.g. 4500). Digits only.", td_style), Paragraph("Displays as ₹4,500 across cards, detail page, and quote RFQ line item.", td_style)],
        [Paragraph("Category Classification *", td_bold), Paragraph("Dropdown", td_style), Paragraph("Select an existing store category (e.g. Furniture, Labs, Sports).", td_style), Paragraph("Assigns item to category filter sidebar on /shop and /furniture.", td_style)],
        [Paragraph("AI Solutions Objective", td_bold), Paragraph("Dropdown", td_style), Paragraph("Map to objective (e.g. Upgrade Existing Campus / Lab / Classroom).", td_style), Paragraph("Feeds into /find-solutions algorithm and homepage search bar.", td_style)],
        [Paragraph("SKU / Product Code", td_bold), Paragraph("Text Input", td_style), Paragraph("Leave blank for auto-generation, or enter enterprise SKU (CM-FURN-01).", td_style), Paragraph("Printed on product specification sheets and admin quote inquiries.", td_style)],
        [Paragraph("Cover Image", td_bold), Paragraph("Media Picker", td_style), Paragraph("Upload file from computer or enter external high-res URL (.jpg, .webp).", td_style), Paragraph("Primary photo on /shop card and main banner on /product/:slug.", td_style)],
        [Paragraph("Gallery Images", td_bold), Paragraph("Multi-Image List", td_style), Paragraph("Add 2 to 5 additional image URLs showing alternate angles and setups.", td_style), Paragraph("Interactive thumbnail gallery on /product/:slug.", td_style)],
        [Paragraph("Technical Specifications", td_bold), Paragraph("Monospace Textarea", td_style), Paragraph("Line-separated Key: Value pairs:<br/>Frame: 18-Gauge Steel<br/>Warranty: 5 Years", td_style), Paragraph("Automatically parsed into formatted Technical Specifications Table.", td_style)],
        [Paragraph("Visible on storefront", td_bold), Paragraph("Checkbox", td_style), Paragraph("Check for immediate live status (active: true); uncheck for draft.", td_style), Paragraph("Controls public visibility on /shop and search results.", td_style)],
        [Paragraph("Show in Featured Sections", td_bold), Paragraph("Checkbox", td_style), Paragraph("Check to badge this product as Featured.", td_style), Paragraph("Adds blue Featured badge and surfaces in homepage showcase.", td_style)]
    ]
    t_prod = Table(prod_fields, colWidths=[100, 70, 200, 150])
    t_prod.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_prod)
    story.append(Spacer(1, 10))

    # MODULE 2: Categories Hub & Taxonomy
    story.append(Paragraph("MODULE 2: Central Categories Hub & Taxonomy Engine", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/categories</font> &nbsp;|&nbsp; <b>Operating Modes:</b> Mode A (Pages), Mode B (Products), Mode C (Objectives)", body_style))
    
    cat_modes = [
        [Paragraph("Operating Mode", th_style), Paragraph("Purpose & Scope", th_style), Paragraph("Step-by-Step Editing Lifecycle & Storefront Output", th_style)],
        [
            Paragraph("Mode A: Showcase Pages<br/><code>?mode=pages</code>", td_bold),
            Paragraph("Controls horizontal category pills on Showcase Hubs (/labs, /sports-infra, /libraries, /ai-guide, /campus-design-execution).", td_style),
            Paragraph("1. Select target page in left sidebar (e.g. Science & Tech Labs).<br/>2. Add category name & click '+ Add Category'.<br/>3. Reorder using &uarr; and &darr; arrow buttons.<br/>4. In 'Card Category Assignment', check/uncheck categories on individual cards.<br/>5. Click 'Save Category Changes'. Updates public pill bar and card filter instantly.", td_style)
        ],
        [
            Paragraph("Mode B: Store Categories<br/><code>?mode=products</code>", td_bold),
            Paragraph("Controls category taxonomy for physical e-commerce inventory (/shop, /furniture).", td_style),
            Paragraph("1. Click '+ Add Store Category' in header.<br/>2. Enter Category Name (e.g. Executive Desks) and Slug (executive-desks).<br/>3. Select Assigned Store Page (Furniture, Labs, Sports, Libraries).<br/>4. Click 'Save Category'. Appears in /shop sidebar and product modal dropdown.", td_style)
        ],
        [
            Paragraph("Mode C: Search Objectives<br/><code>?mode=objectives</code>", td_bold),
            Paragraph("Controls the 6 guided institutional objectives in the homepage search bar and AI Solutions Finder.", td_style),
            Paragraph("1. Click 'Edit' on an existing objective or '+ Add Objective'.<br/>2. Set Identifier (smart-campus), Full Display Label, Short Label, Icon, and Default Route (/tech-infra).<br/>3. Click 'Save Objectives'. Updates homepage search dropdown immediately.", td_style)
        ]
    ]
    t_cat = Table(cat_modes, colWidths=[110, 150, 260])
    t_cat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_cat)
    story.append(Spacer(1, 10))

    # MODULE 3: Commercial Furniture Storefront
    story.append(Paragraph("MODULE 3: Commercial Furniture Storefront & Category Hub Engine", h1_style))
    story.append(Paragraph("<b>Admin Routes:</b> <font color='#0047AB'>/admin/categories?mode=products&page=furniture</font> and <font color='#0047AB'>/admin/pages/furniture</font>", body_style))
    story.append(Paragraph(
        "<b>Important Architectural Invariant:</b><br/>"
        "• <b><code>/furniture</code></b> is an <b>E-Commerce Commercial Product Store</b> displaying physical chairs, tables, hostel bunks, and desks.<br/>"
        "• <b><code>/campus-furniture-design</code></b> is a <b>Turnkey Architectural Advisory Service</b> displaying phased design consultation steps.<br/>"
        "<b>Step 1 (Categories):</b> Open <code>/admin/categories?mode=products</code> &rarr; filter to 'Furniture' &rarr; add categories (chairs, desks, tables, storage).<br/>"
        "<b>Step 2 (Hero & Theme):</b> Open <code>/admin/pages/furniture</code> &rarr; configure Hero Layout (split-right), Hero Background (blue = #002A6C), Heading Font (poppins), and Hero Image &rarr; Save Page Changes.<br/>"
        "<b>Public Result:</b> Visiting <code>/furniture</code> renders your branded CMS hero banner on top, followed by the live store grid pre-scoped to furniture categories.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # MODULE 4: Unified CMS Page Engine
    story.append(Paragraph("MODULE 4: Unified CMS Page Engine (Solution Hubs, Service Suites & Knowledge Hubs)", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/pages</font> &rarr; Click 'Edit' on any page &nbsp;|&nbsp; <b>Component:</b> UnifiedPageEditor.tsx", body_style))
    story.append(Paragraph(
        "This master engine powers 15+ institutional pages across 3 distinct architectural archetypes:<br/>"
        "• <b>Type 1 (Solution Hubs):</b> /sports-infra, /labs, /libraries, /tech-infra<br/>"
        "• <b>Type 2 (Turnkey Service Suites):</b> /campus-design-execution, /campus-furniture-design, /sports-design-execution, /ai-digital-design-supply, /ar-vr-experiences<br/>"
        "• <b>Type 3 (Knowledge Hubs):</b> /ai-guide, /setup-college, /ugc-guidelines, /innovation, /collaboration",
        body_style
    ))

    cms_sections = [
        [Paragraph("Editor Section", th_style), Paragraph("Configurable Fields", th_style), Paragraph("Input Values & Technical Invariants", th_style)],
        [
            Paragraph("1. General Config", td_bold),
            Paragraph("Browser Title *, Publishing Status, Solution Category", td_style),
            Paragraph("Sets page title tag, toggle PUBLISHED (green) vs DRAFT (gray). Maps Hub into AI Solutions Finder taxonomy.", td_style)
        ],
        [
            Paragraph("2. Visual Styling", td_bold),
            Paragraph("Heading Font, Body Font, Primary Color, Hero Bg, CTA Bg, Hero Layout, Grid Columns, Featured Banner, Filters Toggle", td_style),
            Paragraph("Fonts (poppins, playfair, grotesk, inter). Colors (hex picker + swatches). Hero Layouts (minimal, split-right, split-left, centered). Grid columns (2, 3, or 4). Toggles for featured wide card and category bar.", td_style)
        ],
        [
            Paragraph("3. Hero Banner", td_bold),
            Paragraph("Category Eyebrow, Hero Title *, Hero Subtitle, CTA Button Label, CTA Button Link, Featured Cover Image", td_style),
            Paragraph("Eyebrow tag (e.g. TOURNAMENT-GRADE FACILITIES). Full H1 headline. Action button label & href (e.g. Request Facility Audit -> /request-quote). High-res cover image upload.", td_style)
        ],
        [
            Paragraph("4. Cards Collection (Hub & Sub-Details)", td_bold),
            Paragraph("Card Title *, Card Slug *, Category Pills, Cover Image, Card Description, Leaf Subpage Content, Phased Deliverables", td_style),
            Paragraph("<b>Title:</b> Solution name.<br/><b>Slug:</b> Auto-generates subpage URL (/<hub>/<slug>).<br/><b>Subpage Content:</b> Full rich text description of methodology.<br/><b>Phased Deliverables:</b> Structured milestones (Phase 01, Phase 02...) rendered on sub-detail.", td_style)
        ],
        [
            Paragraph("5. Bottom CTA Strip", td_bold),
            Paragraph("CTA Title, CTA Subtitle, CTA Button Label, CTA Button Link, Visibility Toggle", td_style),
            Paragraph("Standardized 2-column flex container in Campus Navy. Title + Subtitle left, button vertically centered right. Automated contrast resolution.", td_style)
        ]
    ]
    t_cms = Table(cms_sections, colWidths=[90, 160, 270])
    t_cms.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_cms)
    story.append(Spacer(1, 10))

    # MODULE 5: Homepage Master Content
    story.append(Paragraph("MODULE 5: Homepage Master Content & Visual Layout Editor", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/homepage-editor</font> &nbsp;|&nbsp; <b>Storefront Target:</b> / (Homepage)", body_style))
    story.append(Paragraph(
        "<b>10 Managed Homepage Sections:</b><br/>"
        "1. <b>Master Controls:</b> Click green <code>● Live on Homepage</code> toggle to instantly unmount any section without deleting data.<br/>"
        "2. <b>Hero Banner:</b> Title, Eyebrow, Subtitle, CTA button label & link, Background photo.<br/>"
        "3. <b>Category Navigation Icons Bar:</b> Category names, icons, links, and active toggles.<br/>"
        "4. <b>Latest Updates Ticker:</b> Scrolling announcement flashes with direct hyperlinks.<br/>"
        "5. <b>Global Search Bar Decision Engine:</b> Institutions dropdown, Objective cards, Popular search chips.<br/>"
        "6. <b>4 Highlight Service Cards:</b> Campus Furniture, Campus Planning, Sports Infra, and AI/Digital Design.<br/>"
        "7. <b>Feature Cards Masonry Grid:</b> Image, Title, Description, Tag color, and pixel height for masonry layout.<br/>"
        "8. <b>Resources & Catalogues Section:</b> Title, subtitle, resource cards with tag and link.<br/>"
        "9. <b>Partnership Enquiry Section:</b> Form headline, subtitle, and consortium benefits checklist.<br/>"
        "10. <b>Institutional Partner Marquee:</b> Infinite scrolling partner logo marquee.<br/>"
        "Click <b>'Save Homepage Content'</b> in the header to broadcast updates live to all visitor sessions.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # MODULE 6: Institutional M&A Directory
    story.append(Paragraph("MODULE 6: Institutional M&A Directory & Asset Dossier Manager", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/colleges</font> &nbsp;|&nbsp; <b>Storefront Target:</b> /colleges-universities-for-sale", body_style))
    
    colleges_data = [
        [Paragraph("Field Name", th_style), Paragraph("Input Type & Value Example", th_style), Paragraph("Storefront Impact & Security Behavior", th_style)],
        [Paragraph("Institutional Title *", td_bold), Paragraph("Text: Private University @ Gujarat", td_style), Paragraph("Main card title and dossier modal headline.", td_style)],
        [Paragraph("Geographical Region *", td_bold), Paragraph("Dropdown: North, South, East, West", td_style), Paragraph("Powers real-time region filter tabs and count badges.", td_style)],
        [Paragraph("Location & Category", td_bold), Paragraph("Text: Ahmedabad, Gujarat | Engineering", td_style), Paragraph("Location badge and classification chip.", td_style)],
        [Paragraph("4 Financial Metrics", td_bold), Paragraph("Asking Price (INR 120 Cr), Run Rate Sales (INR 35 Cr), EBITDA (32%), Rating (8.5)", td_style), Paragraph("Renders 4-box financial valuation ledger in card & dossier.", td_style)],
        [Paragraph("Carousel & Gallery", td_bold), Paragraph("Cover Image + Gallery Images Array", td_style), Paragraph("Card photo carousel (with < > arrows) and full gallery.", td_style)],
        [Paragraph("NDA & Mandate Files", td_bold), Paragraph("PDF Upload or File Path", td_style), Paragraph("Enforces customer login gating (guests prompted to sign in).", td_style)],
        [Paragraph("Executive Scope", td_bold), Paragraph("Multi-line Textarea (Acreage, built-up, capacity)", td_style), Paragraph("Displayed in formatted summary inside dossier modal.", td_style)]
    ]
    t_col = Table(colleges_data, colWidths=[110, 160, 250])
    t_col.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_col)
    story.append(Spacer(1, 10))

    # MODULE 7, 8, 9: AI Finder, Classifieds, Catalogues
    story.append(Paragraph("MODULE 7: AI Solutions Finder & Search Taxonomy Manager", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/solutions-finder</font> &nbsp;|&nbsp; <b>Storefront Target:</b> /find-solutions", body_style))
    story.append(Paragraph(
        "<b>Workflow:</b> Click <b>'+ Add New Solution Card'</b> &rarr; enter Package Title (Turnkey AI & GPU Center of Excellence), Slug (turnkey-ai-coe), Target URL (/labs/ai-stations), Assigned Practice Desk (Laboratories Desk), Domain Badge (Flagship Tech), Deliverable Summary, Inclusions Checklist (Inclusion 1, 2, 3), and NLP Keywords (ai lab, nvidia, gpu cluster) &rarr; Set Display Priority &rarr; Save.<br/>"
        "<b>Storefront Output:</b> Live NLP matching engine on <code>/find-solutions</code> synthesizes client search notes into structured Campus Requirement Briefs and presents your curated packages.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("MODULE 8: Institutional Classifieds & Opportunities Board", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/classifieds</font> &nbsp;|&nbsp; <b>Storefront Target:</b> /classifieds", body_style))
    story.append(Paragraph(
        "<b>Workflow:</b> In Cards Collection, click '+ Add New Card' &rarr; Title (Seeking CSR Funding Partner for 50-Seat AI Lab), Category (Funding, Partnerships, Institutions, Careers), Scope Description, and Action Link (leave blank for in-page Send Enquiry modal) &rarr; Save.<br/>"
        "<b>Storefront Output:</b> Surfaces on <code>/classifieds</code> under matching category tabs. Inquiries post directly to <code>/api/contact</code> and appear in <code>/admin/enquiries</code>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("MODULE 9: Interactive Catalogues & Case Studies Manager", h1_style))
    story.append(Paragraph("<b>Admin Route:</b> <font color='#0047AB'>/admin/catalogues</font> &nbsp;|&nbsp; <b>Storefront Targets:</b> /catalogues, /case-studies/:slug", body_style))
    story.append(Paragraph(
        "<b>PDF Catalogues:</b> Enter Title, Cover Image, and PDF Link (href). If valid PDF URL &rarr; public button displays <b>'Download PDF'</b>. If href is blank or # &rarr; button automatically converts to <b>'Request Catalogue'</b>, opening the lead capture modal!<br/>"
        "<b>Case Studies Showcase:</b> Add Title, Slug, Media Type (Image or HTML5 Video .mp4/.webm), and rich-text narrative &rarr; renders live at <code>/case-studies/&lt;slug&gt;</code> with media player and 'Back to Catalogues' button.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # Quick Reference Summary Table
    story.append(Paragraph("Quick-Reference Summary of Admin Routes", h2_style))
    summary_data = [
        [Paragraph("What Do You Want to Edit?", th_style), Paragraph("Where to Go in Admin", th_style), Paragraph("Governing Module", th_style)],
        [Paragraph("Add/Edit Store Products (Price, Stock, SKU, Images, Specs)", td_style), Paragraph("/admin/products", td_code), Paragraph("Module 1", td_bold)],
        [Paragraph("Add/Edit Store Product Categories (Furniture, Labs, Sports)", td_style), Paragraph("/admin/categories?mode=products", td_code), Paragraph("Module 2 (Mode B)", td_bold)],
        [Paragraph("Add/Edit Showcase Page Filter Pills (Labs, Sports Hub)", td_style), Paragraph("/admin/categories?mode=pages", td_code), Paragraph("Module 2 (Mode A)", td_bold)],
        [Paragraph("Add/Edit Search Bar Objectives & Categories", td_style), Paragraph("/admin/categories?mode=objectives", td_code), Paragraph("Module 2 (Mode C)", td_bold)],
        [Paragraph("Edit Commercial Furniture Storefront (/furniture)", td_style), Paragraph("/admin/pages/furniture", td_code), Paragraph("Module 3", td_bold)],
        [Paragraph("Edit Solution Hubs, Service Suites, or Knowledge Guides", td_style), Paragraph("/admin/pages -> Click Page", td_code), Paragraph("Module 4", td_bold)],
        [Paragraph("Edit Homepage Hero Slider, Search, Tickers, Feature Cards", td_style), Paragraph("/admin/homepage-editor", td_code), Paragraph("Module 5", td_bold)],
        [Paragraph("Add/Edit Colleges / Schools for Sale & NDA PDFs", td_style), Paragraph("/admin/colleges", td_code), Paragraph("Module 6", td_bold)],
        [Paragraph("Add/Edit AI Solutions Finder Packages & Keywords", td_style), Paragraph("/admin/solutions-finder", td_code), Paragraph("Module 7", td_bold)],
        [Paragraph("Add/Edit Classifieds & Partnership Opportunities", td_style), Paragraph("/admin/classifieds", td_code), Paragraph("Module 8", td_bold)],
        [Paragraph("Add/Edit PDF Catalogues & Case Studies", td_style), Paragraph("/admin/catalogues", td_code), Paragraph("Module 9", td_bold)],
    ]
    t_sum = Table(summary_data, colWidths=[200, 190, 130])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_sum)

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF built successfully: {filename}")

if __name__ == '__main__':
    output_pdf = "d:/campussmart/reports/CampusMart-Admin-Editor-Manual.pdf"
    build_pdf(output_pdf)
