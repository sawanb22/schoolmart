const fs = require('fs');
const path = require('path');

// 1. Update src/pages/my-account.tsx
const myAccountPath = path.join(__dirname, '../../src/pages/my-account.tsx');
let myAccount = fs.readFileSync(myAccountPath, 'utf8');

// Replace imports: remove ShoppingBag and Package if only used in orders
myAccount = myAccount.replace(
    "import { User, ShoppingBag, Heart, MapPin, LogOut, Edit, Package, Check, Send } from 'lucide-react';",
    "import { User, Heart, MapPin, LogOut, Edit, Check, Send } from 'lucide-react';"
);

// Remove Order interface
myAccount = myAccount.replace(
    /interface Order \{[\s\S]*?^\}\s*\n/m,
    ""
);

// Remove 'orders' from tab whitelist
myAccount = myAccount.replace(
    "initialTab && ['profile', 'orders', 'wishlist', 'addresses'].includes(initialTab) ? initialTab : 'profile'",
    "initialTab && ['profile', 'wishlist', 'addresses'].includes(initialTab) ? initialTab : 'profile'"
);
myAccount = myAccount.replace(
    "if (tab && ['profile', 'orders', 'wishlist', 'addresses'].includes(tab)) {",
    "if (tab && ['profile', 'wishlist', 'addresses'].includes(tab)) {"
);

// Remove orders state and fetching
myAccount = myAccount.replace(
    "  const [orders, setOrders] = useState<Order[]>([]);\n  const [ordersLoading, setOrdersLoading] = useState(false);\n",
    ""
);
myAccount = myAccount.replace(
    "  const [orders, setOrders] = useState<Order[]>([]);\r\n  const [ordersLoading, setOrdersLoading] = useState(false);\r\n",
    ""
);

myAccount = myAccount.replace(
    /  useEffect\(\(\) => \{\s+if \(!isLoggedIn\) return;\s+setOrdersLoading\(true\);[\s\S]*?\.finally\(\(\) => setOrdersLoading\(false\)\);\s+\}, \[isLoggedIn\]\);/m,
    ""
);

// Remove orders tab from tab list
myAccount = myAccount.replace(
    "    { id: 'profile', label: 'Profile', icon: User },\n    { id: 'orders', label: 'My Orders', icon: ShoppingBag },\n",
    "    { id: 'profile', label: 'Profile', icon: User },\n"
);
myAccount = myAccount.replace(
    "    { id: 'profile', label: 'Profile', icon: User },\r\n    { id: 'orders', label: 'My Orders', icon: ShoppingBag },\r\n",
    "    { id: 'profile', label: 'Profile', icon: User },\r\n"
);

// Update welcome text
myAccount = myAccount.replace(
    "Please login or create an account to access your profile, orders, and wishlist.",
    "Please login or create an account to access your profile, saved wishlist, and quotation requests."
);

// Remove activeTab === 'orders' section
const orderSectionRegex = /\{activeTab === 'orders' && \([\s\S]*?^\s*\)\}\s*\n/m;
myAccount = myAccount.replace(orderSectionRegex, "");

fs.writeFileSync(myAccountPath, myAccount, 'utf8');
console.log('✓ Successfully updated src/pages/my-account.tsx');

// 2. Update src/admin/components/Layout.tsx
const layoutPath = path.join(__dirname, '../../src/admin/components/Layout.tsx');
let layout = fs.readFileSync(layoutPath, 'utf8');

// Remove ShoppingBag import
layout = layout.replace(
    "LayoutDashboard, Package, BookOpen, ShoppingBag, Users, MessageSquare,",
    "LayoutDashboard, Package, BookOpen, Users, MessageSquare,"
);

// Update Orders & Enquiries group
layout = layout.replace(
    /\{\s*label: 'Orders & Enquiries',\s*items: \[\s*\{ to: '\/admin\/orders', icon: ShoppingBag, label: 'Orders', desc: 'Track & manage orders' \},\s*\{ to: '\/admin\/enquiries', icon: MessageSquare, label: 'Enquiries', desc: 'Quote requests & leads' \},\s*\{ to: '\/admin\/wishlist-report', icon: Heart, label: 'Wishlist Reports', desc: 'Leads for quotations' \},\s*\]\s*\},/m,
    `{
        label: 'Quotations & Enquiries',
        items: [
            { to: '/admin/enquiries', icon: MessageSquare, label: 'Quote Enquiries', desc: 'Quote requests & leads' },
            { to: '/admin/wishlist-report', icon: Heart, label: 'Wishlist Reports', desc: 'Leads for quotations' },
        ]
    },`
);

fs.writeFileSync(layoutPath, layout, 'utf8');
console.log('✓ Successfully updated src/admin/components/Layout.tsx');

// 3. Update src/admin/pages/Dashboard.tsx
const dashboardPath = path.join(__dirname, '../../src/admin/pages/Dashboard.tsx');
let dashboard = fs.readFileSync(dashboardPath, 'utf8');

// Replace Quick Links section
dashboard = dashboard.replace(
    /heading: '📬 Orders & Enquiries',\s*color: 'orange',\s*items: \[\s*\{ to: '\/admin\/orders', icon: ShoppingBag, label: 'Orders', desc: 'Track and update all orders', bg: 'bg-orange-50', txt: 'text-orange-700', ibg: 'bg-orange-100' \},/m,
    `heading: '📬 Quotations & Enquiries',
        color: 'orange',
        items: [`
);

// Replace Stat card
dashboard = dashboard.replace(
    "{ label: 'Total Orders', value: stats?.orders ?? '–', icon: ShoppingBag, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700' },",
    "{ label: 'Quote Requests', value: (stats?.unreadQuotes || 0) + (stats?.unreadEnquiries || 0), icon: MessageSquare, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700' },"
);

fs.writeFileSync(dashboardPath, dashboard, 'utf8');
console.log('✓ Successfully updated src/admin/pages/Dashboard.tsx');

// 4. Update src/admin/AdminRoutes.tsx
const adminRoutesPath = path.join(__dirname, '../../src/admin/AdminRoutes.tsx');
let adminRoutes = fs.readFileSync(adminRoutesPath, 'utf8');

adminRoutes = adminRoutes.replace(
    "const Orders = lazy(() => import('./pages/Orders'));\n",
    ""
);
adminRoutes = adminRoutes.replace(
    "const Orders = lazy(() => import('./pages/Orders'));\r\n",
    ""
);

adminRoutes = adminRoutes.replace(
    '<Route path="orders" element={<Suspense fallback={<Loader />}><Orders /></Suspense>} />',
    '<Route path="orders" element={<Navigate to="/admin/enquiries" replace />} />'
);

fs.writeFileSync(adminRoutesPath, adminRoutes, 'utf8');
console.log('✓ Successfully updated src/admin/AdminRoutes.tsx');
