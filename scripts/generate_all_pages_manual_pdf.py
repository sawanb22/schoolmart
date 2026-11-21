import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
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
            self.drawString(36, 810, "CampusMart Platform — All-Pages Editor Manual & Complete Field Directory")
            self.drawRightString(A4[0] - 36, 810, "ADMINISTRATOR OPERATIONS GUIDE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 804, A4[0] - 36, 804)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 45, A4[0] - 36, 45)
        self.drawString(36, 32, "CampusMart Central Administration • All 68 Pages Documented")
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

    navy_dark = colors.HexColor("#002A6C")
    navy_light = colors.HexColor("#0F3C8A")
    gold_accent = colors.HexColor("#D97706")
    slate_dark = colors.HexColor("#0F172A")
    slate_body = colors.HexColor("#334155")
    slate_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=navy_dark,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=gold_accent,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionHeading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=navy_dark,
        spaceBefore=12,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionHeading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=navy_light,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=slate_body,
        spaceAfter=5
    )

    th_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white
    )

    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=slate_dark
    )

    td_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=navy_dark
    )

    td_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # Title Banner Block
    story.append(Paragraph("CampusMart — Master All-Pages Admin Editor Manual", title_style))
    story.append(Paragraph("Complete Page-by-Page Inventory, Template Groupings, Field Definitions & Lifecycle Guide (68 Pages)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=navy_dark, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "<b>Comprehensive Platform Scope:</b> This manual provides an exhaustive, field-by-field administrative reference covering every single page "
        "currently deployed in the CampusMart system. Pages are grouped by their single master template engines to eliminate redundancy while documenting "
        "all unique fields, input semantics, and live user-facing reflections.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # --- GROUP A ---
    story.append(Paragraph("GROUP A: Solution Infrastructure Hubs (4 Pages)", h1_style))
    story.append(Paragraph("<b>Master Engine:</b> SolutionPageRenderer.tsx &nbsp;|&nbsp; <b>Admin Location:</b> /admin/pages &rarr; click 'Edit' on page slug", body_style))
    
    group_a_pages = [
        [Paragraph("Page Name", th_style), Paragraph("Storefront URL", th_style), Paragraph("Database Slug", th_style), Paragraph("Sub-Detail Routing", th_style)],
        [Paragraph("Sports Infrastructure", td_bold), Paragraph("/sports-infra", td_code), Paragraph("sports-infra", td_code), Paragraph("/sports-infra/:facilitySlug (9 facilities)", td_style)],
        [Paragraph("Laboratory Solutions", td_bold), Paragraph("/labs", td_code), Paragraph("labs", td_code), Paragraph("/labs/:labSlug (9 laboratory environments)", td_style)],
        [Paragraph("Library Solutions", td_bold), Paragraph("/libraries", td_code), Paragraph("libraries", td_code), Paragraph("/libraries/:featureSlug (9 reading & stack ranges)", td_style)],
        [Paragraph("Technology Infrastructure", td_bold), Paragraph("/tech-infra", td_code), Paragraph("tech-infra", td_code), Paragraph("/tech-infra/:solutionSlug (4 IT networks & server solutions)", td_style)],
    ]
    t_ga = Table(group_a_pages, colWidths=[110, 80, 80, 250])
    t_ga.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_ga)
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Group A Editor Fields (in UnifiedPageEditor):</b>", h2_style))
    ga_fields = [
        [Paragraph("Field Label in UI", th_style), Paragraph("Input Type", th_style), Paragraph("What to Fill & Value Semantics", th_style), Paragraph("Storefront Reflection", th_style)],
        [Paragraph("Browser Title *", td_bold), Paragraph("Text", td_style), Paragraph("Page title (e.g. Laboratory Solutions — Turnkey Science & Research Labs).", td_style), Paragraph("Browser tab title and header breadcrumb name.", td_style)],
        [Paragraph("Publishing Status", td_bold), Paragraph("Toggle Button", td_style), Paragraph("Click to toggle PUBLISHED & VISIBLE (green) vs SAVED AS DRAFT (gray).", td_style), Paragraph("Draft pages return HTTP 404 to non-admin visitors.", td_style)],
        [Paragraph("Primary Solution Category", td_bold), Paragraph("Dropdown", td_style), Paragraph("Map into search objective (e.g. Upgrade Existing Campus / Lab / Classroom).", td_style), Paragraph("Inherited by cards when calculating AI Solutions Finder relevance.", td_style)],
        [Paragraph("Visual Styling Controls", td_bold), Paragraph("Color / Dropdown", td_style), Paragraph("Primary Color (#0047ab), Hero Bg (blue), Heading Font (poppins), Hero Layout (split-right).", td_style), Paragraph("Controls color accents, hero banner styling, and card grid typography.", td_style)],
        [Paragraph("Hero Eyebrow / Tag", td_bold), Paragraph("Text", td_style), Paragraph("Uppercase category pill (e.g. TOURNAMENT-GRADE FACILITIES).", td_style), Paragraph("Rendered in yellow/blue pill directly above main H1 headline.", td_style)],
        [Paragraph("Hero Headline & Subtitle", td_bold), Paragraph("Text / Textarea", td_style), Paragraph("Main H1 title and 2-sentence institutional summary.", td_style), Paragraph("Top banner headline and narrative block.", td_style)],
        [Paragraph("Card Title & Slug *", td_bold), Paragraph("Text (Per Card)", td_style), Paragraph("Card name (e.g. Math Lab) and URL slug (math-lab).", td_style), Paragraph("Title on card and generates leaf URL: /<hub>/<slug>.", td_style)],
        [Paragraph("Card Categories", td_bold), Paragraph("Checkboxes", td_style), Paragraph("Assign to filter tabs (e.g. Skill Labs, STEM & Innovation).", td_style), Paragraph("Determines which category tab(s) display this card.", td_style)],
        [Paragraph("Card Detailed Content", td_bold), Paragraph("HTML Rich Text", td_style), Paragraph("Comprehensive technical methodology, equipment list, room requirements.", td_style), Paragraph("Renders full reading article on /<hub>/<slug> sub-detail page.", td_style)],
        [Paragraph("Standardized Bottom CTA", td_bold), Paragraph("Text Fields", td_style), Paragraph("CTA Title, CTA Subtitle, Button Label (Request Quote), Button Link (/request-quote).", td_style), Paragraph("Full-width Campus Navy 2-column banner at bottom of hub.", td_style)],
    ]
    t_ga_f = Table(ga_fields, colWidths=[100, 70, 190, 160])
    t_ga_f.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_light),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_ga_f)
    story.append(Spacer(1, 8))

    # --- GROUP B ---
    story.append(Paragraph("GROUP B: Turnkey Service Suites & Phased Execution Hubs (7 Pages)", h1_style))
    story.append(Paragraph("<b>Master Engine:</b> ServicePageRenderer.tsx &nbsp;|&nbsp; <b>Admin Location:</b> /admin/pages &rarr; click 'Edit' on page slug", body_style))
    
    group_b_pages = [
        [Paragraph("Page Name", th_style), Paragraph("Storefront URL", th_style), Paragraph("Slug", th_style), Paragraph("Distinct Setup / Nuance", th_style)],
        [Paragraph("Campus Design Execution", td_bold), Paragraph("/campus-design-execution", td_code), Paragraph("campus-design-execution", td_code), Paragraph("3 columns, minimal hero, #0047ab, 6 turnkey steps", td_style)],
        [Paragraph("Campus Furniture Design", td_bold), Paragraph("/campus-furniture-design", td_code), Paragraph("campus-furniture-design", td_code), Paragraph("3 columns, minimal hero, #0047ab, 6 furniture ranges", td_style)],
        [Paragraph("Sports Design Execution", td_bold), Paragraph("/sports-design-execution", td_code), Paragraph("sports-design-execution", td_code), Paragraph("<b>4 columns (xl:grid-cols-4)</b>, 6 civil execution phases", td_style)],
        [Paragraph("AI Digital Design & Supply", td_bold), Paragraph("/ai-digital-design-supply", td_code), Paragraph("ai-digital-design-supply", td_code), Paragraph("<b>Active category filter bar</b>, Slate dark theme (#1e293b)", td_style)],
        [Paragraph("AR / VR Experiences", td_bold), Paragraph("/ar-vr-experiences", td_code), Paragraph("ar-vr-experiences", td_code), Paragraph("3 columns, minimal hero, 6 immersive VR/AR modules", td_style)],
        [Paragraph("Campus Design (Master)", td_bold), Paragraph("/campus-design", td_code), Paragraph("campus-design", td_code), Paragraph("<b>Split-right hero</b>, Dark forest green theme (#385f11), 10 cards", td_style)],
        [Paragraph("Campus Master Planning", td_bold), Paragraph("/campus-master-planning", td_code), Paragraph("campus-master-planning", td_code), Paragraph("<b>Integrated Wishlist Heart engine</b>, category filter chips", td_style)],
    ]
    t_gb = Table(group_b_pages, colWidths=[110, 110, 100, 200])
    t_gb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_gb)
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        "<b>Unique Group B Field: Phased Deliverables Milestone Builder:</b><br/>"
        "In addition to standard card fields, expanding any card in Group B provides a <b>'Phased Deliverables'</b> list. "
        "Admins enter structured deliverables (e.g. <code>Phase 01: Topographical Survey</code>, <code>Phase 02: Civil Sub-Base</code>, <code>Phase 03: Synthetic Turf & Lighting</code>). "
        "The system automatically synthesizes these into structured phase milestone cards on the sub-detail leaf page (<code>/<hub>/<slug></code>).",
        body_style
    ))
    story.append(Spacer(1, 8))

    # --- GROUP C ---
    story.append(Paragraph("GROUP C: Strategic Knowledge, Advisory & Custom Grid Hubs (14 Pages)", h1_style))
    story.append(Paragraph("<b>Master Engine:</b> GenericPageRenderer.tsx (Grid Mode) + Specialized Verticals &nbsp;|&nbsp; <b>Admin Location:</b> /admin/pages", body_style))
    
    group_c_pages = [
        [Paragraph("Page Name", th_style), Paragraph("Storefront URL", th_style), Paragraph("Slug", th_style), Paragraph("Editor Structure & Custom Features", th_style)],
        [Paragraph("AI Guide", td_bold), Paragraph("/ai-guide", td_code), Paragraph("ai-guide", td_code), Paragraph("GenericPageRenderer: 4 cards, featured wide card on 'All', category chips", td_style)],
        [Paragraph("Setup Your College", td_bold), Paragraph("/setup-college", td_code), Paragraph("setup-college", td_code), Paragraph("GenericPageRenderer: 4 advisory cards, UniversalArticleDetail subpages", td_style)],
        [Paragraph("UGC Guidelines", td_bold), Paragraph("/ugc-guidelines", td_code), Paragraph("ugc-guidelines", td_code), Paragraph("GenericPageRenderer: 4 compliance cards, UniversalArticleDetail subpages", td_style)],
        [Paragraph("Resources & Guides", td_bold), Paragraph("/resources", td_code), Paragraph("resources", td_code), Paragraph("GenericPageRenderer: Hero banner + bottom CTA (0 cards, clean empty state)", td_style)],
        [Paragraph("Collaboration / HR", td_bold), Paragraph("/collaboration", td_code), Paragraph("collaboration", td_code), Paragraph("GenericPageRenderer: 6 placement cards, ServiceDetailPage subpages", td_style)],
        [Paragraph("Campus Sports Infra...", td_bold), Paragraph("/campus-sports-infra...", td_code), Paragraph("campus-sports-infra...", td_code), Paragraph("GenericPageRenderer: Long-form slug, links to smart classrooms guide", td_style)],
        [Paragraph("Innovation Hub", td_bold), Paragraph("/innovation", td_code), Paragraph("innovation", td_code), Paragraph("GenericPageRenderer: 7 innovation tracks (Ideation, Incubation, Venture)", td_style)],
        [Paragraph("AI & ML Labs", td_bold), Paragraph("/ai-ml", td_code), Paragraph("ai-ml", td_code), Paragraph("<b>Dedicated ai-ml.tsx:</b> Integrated Wishlist Heart engine, 4:3 cards", td_style)],
        [Paragraph("AI Learning Stations", td_bold), Paragraph("/ai-stations", td_code), Paragraph("ai-stations", td_code), Paragraph("<b>Dedicated ai-stations.tsx:</b> Portrait 4:5 cards, glassy Lucide icons, no filter bar", td_style)],
        [Paragraph("Campus Automation", td_bold), Paragraph("/campus-automation", td_code), Paragraph("campus-automation", td_code), Paragraph("<b>Dedicated campus-automation.tsx:</b> Module counter badge, Wishlist buttons", td_style)],
        [Paragraph("Collaboration Spaces", td_bold), Paragraph("/collaboration-spaces", td_code), Paragraph("collaboration-spaces", td_code), Paragraph("<b>Dedicated collaboration-spaces.tsx:</b> No hero, pastel covers, hardcoded CTA", td_style)],
        [Paragraph("New Environments", td_bold), Paragraph("/new-environments", td_code), Paragraph("new-environments", td_code), Paragraph("Dedicated vertical: Future classroom learning environments & breakout pods", td_style)],
        [Paragraph("Assessment System", td_bold), Paragraph("/assessment-system", td_code), Paragraph("assessment-system", td_code), Paragraph("Specialized testing & examination infrastructure module", td_style)],
        [Paragraph("Learning Management (LMS)", td_bold), Paragraph("/lms", td_code), Paragraph("lms", td_code), Paragraph("Campus LMS & academic management software showcase", td_style)],
        [Paragraph("Library Management", td_bold), Paragraph("/library-management", td_code), Paragraph("library-management", td_code), Paragraph("RFID, digital OPAC, and library automation module", td_style)],
    ]
    t_gc = Table(group_c_pages, colWidths=[90, 105, 95, 230])
    t_gc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_gc)
    story.append(Spacer(1, 8))

    # --- GROUP D ---
    story.append(Paragraph("GROUP D: Standalone Detail & Policy Articles (17 Pages)", h1_style))
    story.append(Paragraph("<b>Master Engine:</b> GenericPageRenderer.tsx (Article Mode) &nbsp;|&nbsp; <b>Admin Location:</b> /admin/pages", body_style))
    
    group_d_pages = [
        [Paragraph("Page Group / Category", th_style), Paragraph("Storefront URLs & Slugs Included", th_style), Paragraph("Editor Structure & Publishing Invariant", th_style)],
        [
            Paragraph("Legal & Root Policies<br/>(5 pages)", td_bold),
            Paragraph("• /privacy-policy (privacy-policy)<br/>• /terms-of-use (terms-of-use)<br/>• /payment-policy (payment-policy)<br/>• /replacement-return (replacement-return)<br/>• /order-rejection (order-rejection)", td_style),
            Paragraph("<b>Layout:</b> Detail / Article Layout.<br/><b>Fields:</b> Browser Title *, Article Headline, Article Body (HTML Rich Text).<br/><b>Invariant:</b> <code>hideCta: true</code> (Bottom inquiry CTA is cleanly suppressed).", td_style)
        ],
        [
            Paragraph("Fully Authored Articles<br/>(8 pages)", td_bold),
            Paragraph("• /how-it-works (how-it-works)<br/>• /sell-on-campusmart (sell-on-campusmart)<br/>• /student-life-centers (student-life-centers)<br/>• /academic-buildings (academic-buildings)<br/>• /research-facilities (research-facilities)<br/>• /brand-help (brand-help)<br/>• /20-stunning-college-buildings<br/>• /smart-classrooms-complete-campus-tech-guide", td_style),
            Paragraph("<b>Layout:</b> Detail / Article Layout.<br/><b>Fields:</b> Category Tag, Headline, Featured Cover Banner (Unsplash photo), Article Body (DOMPurify rich text), Section Heading.<br/><b>Bottom CTA:</b> Active 2-column banner linking to /request-quote, /contact-us, or /partnership.", td_style)
        ],
        [
            Paragraph("Stubs & Test Articles<br/>(4 pages)", td_bold),
            Paragraph("• /green-campus (green-campus)<br/>• /renovation (renovation)<br/>• /colleges-for-sale-2 (colleges-for-sale-2)<br/>• /medical-college-pune (medical-college-pune)", td_style),
            Paragraph("Short placeholder stubs. Admins can expand these into full reading articles at any time by updating Article Body in <code>UnifiedPageEditor</code>.", td_style)
        ]
    ]
    t_gd = Table(group_d_pages, colWidths=[100, 200, 220])
    t_gd.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_gd)
    story.append(Spacer(1, 8))

    # --- GROUP E ---
    story.append(Paragraph("GROUP E: Dedicated Functional Portals & Specialized Commerce Editors (12 Pages)", h1_style))
    story.append(Paragraph("These pages operate on purpose-built database entities, custom schemas, and specialized admin managers:", body_style))

    group_e_portals = [
        [Paragraph("Page & URL", th_style), Paragraph("Admin Panel Route", th_style), Paragraph("Full Field Directory & Editing Workflow", th_style)],
        [
            Paragraph("Homepage<br/><code>/</code>", td_bold),
            Paragraph("/admin/homepage-editor", td_code),
            Paragraph("<b>10 Managed Sections:</b> Master Visibility Toggles, Hero Slider (Title, Subtitle, CTA Label & Link, Photo), Category Navigation Bar, Updates Ticker, Global Search Bar & Decision Engine, 4 Highlight Service Cards, Feature Cards Masonry Grid, Resources Section, Partnership Form, and Partner Marquee.", td_style)
        ],
        [
            Paragraph("Product Inventory & Shop<br/><code>/shop</code>, <code>/product/:slug</code>", td_bold),
            Paragraph("/admin/products", td_code),
            Paragraph("<b>12 Catalog Fields:</b> Product Name *, Narrative, Listing Price (₹) *, Category Classification *, AI Objective, SKU, Cover Image, Gallery Images, Technical Specifications (parsed Key: Value pairs), Visible toggle, Featured toggle. Supports bulk CSV upload.", td_style)
        ],
        [
            Paragraph("Commercial Furniture<br/><code>/furniture</code>", td_bold),
            Paragraph("/admin/categories?mode=products&page=furniture<br/>+ /admin/pages/furniture", td_code),
            Paragraph("<b>Dual-layer Engine:</b><br/>1. Create furniture categories (chairs, desks, tables, storage) in Categories Manager.<br/>2. Style CMS Hero banner (split-right layout, Campus Navy #002a6c, photo) in UnifiedPageEditor.", td_style)
        ],
        [
            Paragraph("Colleges & Universities for Sale<br/><code>/colleges-universities-for-sale</code>", td_bold),
            Paragraph("/admin/colleges", td_code),
            Paragraph("<b>Asset Modal:</b> Title *, Region * (North, South, East, West), City/State, Category, 4 Financial Metrics (Asking Price, Sales, EBITDA, Rating), Verified badge, Cover Image, Gallery Array (powers card carousel & dossier modal), Gated NDA & Mandate PDF links, Executive Scope.", td_style)
        ],
        [
            Paragraph("AI Solutions Finder<br/><code>/find-solutions</code>", td_bold),
            Paragraph("/admin/solutions-finder", td_code),
            Paragraph("<b>Turnkey Package Fields:</b> Title *, Slug *, Target URL *, Practice Desk (Laboratories, Architecture, Sports), Domain Badge, Deliverable Narrative, Key Inclusions Checklist, NLP Keywords (ai lab, nvidia, gpu), Priority Score, Active status.", td_style)
        ],
        [
            Paragraph("Institutional Classifieds<br/><code>/classifieds</code>", td_bold),
            Paragraph("/admin/classifieds", td_code),
            Paragraph("<b>Opportunity Fields:</b> Title *, Category (Funding, Partnerships, Institutions, Careers), Scope Description, Action Link (leave blank to trigger in-page Send Enquiry modal). Submissions route to /api/contact.", td_style)
        ],
        [
            Paragraph("Catalogues & Case Studies<br/><code>/catalogues</code><br/><code>/case-studies/:slug</code>", td_bold),
            Paragraph("/admin/catalogues", td_code),
            Paragraph("<b>Catalogues:</b> Title, Cover, PDF link. (Valid PDF = 'Download PDF' button; blank/hash = 'Request Catalogue' modal).<br/><b>Case Studies:</b> Title, Slug, HTML5 Video (.mp4) or Image, and rich text narrative.", td_style)
        ],
        [
            Paragraph("Corporate, Lead & Careers<br/><code>/about-us</code>, <code>/contact-us</code>,<br/><code>/partner-with-colleges</code>,<br/><code>/job-openings</code>, <code>/faq</code>", td_bold),
            Paragraph("/admin/pages<br/>(slugOverride)", td_code),
            Paragraph("• /about-us: Founding year, stats counters, mission, leadership team, partner logos.<br/>• /contact-us: Category/sub-category dropdown lead form.<br/>• /job-openings: Roles list and multipart PDF resume upload form.<br/>• /faq: Real-time search query filtering accordion knowledge base.", td_style)
        ]
    ]
    t_ge = Table(group_e_portals, colWidths=[105, 125, 290])
    t_ge.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), navy_dark),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, slate_bg])
    ]))
    story.append(t_ge)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"All-Pages PDF built successfully: {filename}")

if __name__ == '__main__':
    output_pdf = "C:/Users/Administrator/.gemini/antigravity/brain/dc209a97-d93a-4cd3-b9d0-4f33cb62198a/CampusMart-All-Pages-Editor-Manual.pdf"
    build_pdf(output_pdf)
