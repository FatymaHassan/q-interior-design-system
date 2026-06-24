import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import {
  adjustMaterialStock,
  cancelPurchaseOrder,
  createMaterial,
  createMaterialCategory,
  createPurchaseOrder,
  createSupplier,
  deleteMaterial,
  deleteMaterialCategory,
  deleteSupplier,
  getInventoryMovements,
  getInventoryOverview,
  getInventoryReport,
  getMaterialCategories,
  getMaterials,
  getPurchaseOrders,
  getSuppliers,
  receivePurchaseOrder,
  stockInMaterial,
  stockOutMaterial,
  updateMaterial,
  updateSupplier,
} from "../../services/api";

const tabs = ["Dashboard", "Categories", "Materials", "Movements", "Purchase Orders", "Suppliers", "Reports"];
const materialUnits = ["M2", "Meter", "Piece", "Unit", "Set", "Day", "Hour", "Lump Sum", "Custom"];
const emptyMaterial = { code: "", name: "", material_category_id: "", supplier_id: "", unit: "Unit", purchase_price: "", selling_price: "", current_stock: 0, minimum_stock: 0, storage_location: "", status: "Active", notes: "" };
const emptySupplier = { name: "", category: "General", contact_person: "", email: "", phone: "", address: "", city: "", payment_terms: "", opening_balance: 0, status: "Active", notes: "" };

export default function InventoryModule() {
  const [active, setActive] = useState("Dashboard");
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [movements, setMovements] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [reports, setReports] = useState({});
  const [materialForm, setMaterialForm] = useState(emptyMaterial);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", status: "Active" });
  const [movementForm, setMovementForm] = useState({ material_id: "", type: "Stock In", quantity: 1, unit_cost: "", notes: "" });
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [poForm, setPoForm] = useState({ supplier_id: "", order_date: new Date().toISOString().slice(0, 10), expected_date: "", notes: "", items: [{ material_id: "", quantity: 1, unit_price: "" }] });
  const [notice, setNotice] = useState("");

  const load = () => Promise.all([
    getInventoryOverview(),
    getMaterialCategories(),
    getMaterials(),
    getInventoryMovements(),
    getPurchaseOrders(),
    getSuppliers(),
    getInventoryReport("stock-levels"),
    getInventoryReport("low-stock"),
    getInventoryReport("supplier-balance"),
  ]).then(([overviewData, categoryData, materialData, movementData, orderData, supplierData, stockReport, lowReport, supplierReport]) => {
    setOverview(overviewData);
    setCategories(categoryData);
    setMaterials(materialData);
    setMovements(movementData);
    setPurchaseOrders(orderData);
    setSuppliers(supplierData);
    setReports({ stockReport, lowReport, supplierReport });
    setMaterialForm((current) => ({ ...current, material_category_id: current.material_category_id || categoryData[0]?.id || "", supplier_id: current.supplier_id || supplierData[0]?.id || "" }));
    setMovementForm((current) => ({ ...current, material_id: current.material_id || materialData[0]?.id || "", unit_cost: current.unit_cost || materialData[0]?.purchasePrice || "" }));
    setPoForm((current) => ({
      ...current,
      supplier_id: current.supplier_id || supplierData[0]?.id || "",
      items: current.items.map((item) => ({ ...item, material_id: item.material_id || materialData[0]?.id || "", unit_price: item.unit_price || materialData[0]?.purchasePrice || "" })),
    }));
    setNotice("");
  }).catch((error) => setNotice(error.response?.status === 403 ? "Your role cannot access inventory yet." : "Backend is not reachable."));

  useEffect(() => {
    load();
  }, []);

  const materialOptions = materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.currentStock} {material.unit})</option>);
  const supplierOptions = suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>);
  const categoryOptions = categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>);

  const saveMaterial = async (event) => {
    event.preventDefault();
    const payload = {
      ...materialForm,
      material_category_id: Number(materialForm.material_category_id),
      supplier_id: materialForm.supplier_id ? Number(materialForm.supplier_id) : null,
      purchase_price: Number(materialForm.purchase_price || 0),
      selling_price: Number(materialForm.selling_price || 0),
      current_stock: Number(materialForm.current_stock || 0),
      minimum_stock: Number(materialForm.minimum_stock || 0),
    };
    editingMaterial ? await updateMaterial(editingMaterial.id, payload) : await createMaterial(payload);
    setMaterialForm(emptyMaterial);
    setEditingMaterial(null);
    load();
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    const payload = { ...supplierForm, opening_balance: Number(supplierForm.opening_balance || 0) };
    editingSupplier ? await updateSupplier(editingSupplier.id, payload) : await createSupplier(payload);
    setSupplierForm(emptySupplier);
    setEditingSupplier(null);
    load();
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    const material = materials.find((item) => Number(item.id) === Number(movementForm.material_id));
    const payload = { quantity: Number(movementForm.quantity), unit_cost: Number(movementForm.unit_cost || material?.purchasePrice || 0), notes: movementForm.notes };
    if (movementForm.type === "Stock In") await stockInMaterial(movementForm.material_id, payload);
    if (movementForm.type === "Stock Out") await stockOutMaterial(movementForm.material_id, payload);
    if (movementForm.type === "Adjustment") await adjustMaterialStock(movementForm.material_id, payload);
    setMovementForm((current) => ({ ...current, quantity: 1, notes: "" }));
    load();
  };

  const submitPurchaseOrder = async (event) => {
    event.preventDefault();
    await createPurchaseOrder({
      supplier_id: Number(poForm.supplier_id),
      order_date: poForm.order_date,
      expected_delivery_date: poForm.expected_date || null,
      notes: poForm.notes,
      items: poForm.items.map((item) => ({ material_id: Number(item.material_id), quantity_ordered: Number(item.quantity || 0), unit_price: Number(item.unit_price || 0) })),
    });
    setPoForm({ supplier_id: suppliers[0]?.id || "", order_date: new Date().toISOString().slice(0, 10), expected_date: "", notes: "", items: [{ material_id: materials[0]?.id || "", quantity: 1, unit_price: materials[0]?.purchasePrice || "" }] });
    load();
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Phase 6</p>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Inventory & Suppliers</h1>
        <p className="mt-1 text-sm text-brand-muted">Materials, stock movements, purchase orders, suppliers, and inventory reports.</p>
      </div>
      <div className="flex flex-wrap gap-2">{tabs.map((tab) => <Button key={tab} type="button" variant={active === tab ? "primary" : "outline"} className="px-3 py-2" onClick={() => setActive(tab)}>{tab}</Button>)}</div>
    </div>
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}

    {active === "Dashboard" && <InventoryDashboard overview={overview} />}

    {active === "Categories" && <Card className="p-5">
      <h2 className="text-xl font-bold">Material Categories</h2>
      <form onSubmit={async (event) => { event.preventDefault(); await createMaterialCategory(categoryForm); setCategoryForm({ name: "", description: "", status: "Active" }); load(); }} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr_160px_auto]">
        <input required placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} className={fieldInputClass} />
        <input placeholder="Description" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} className={fieldInputClass} />
        <select value={categoryForm.status} onChange={(event) => setCategoryForm({ ...categoryForm, status: event.target.value })} className={fieldInputClass}><option>Active</option><option>Inactive</option></select>
        <Button>Add</Button>
      </form>
      <div className="mt-5">
        <Table columns={[
          { key: "name", label: "Category" },
          { key: "description", label: "Description" },
          { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
          { key: "actions", label: "Actions", render: (row) => <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => window.confirm(`Delete ${row.name}?`) && deleteMaterialCategory(row.id).then(load)}>Delete</Button> },
        ]} rows={categories} />
      </div>
    </Card>}

    {active === "Materials" && <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.5fr]">
      <Card className="p-5">
        <h2 className="text-xl font-bold">{editingMaterial ? "Edit Material" : "Add Material"}</h2>
        <form onSubmit={saveMaterial} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Code"><input value={materialForm.code} onChange={(event) => setMaterialForm({ ...materialForm, code: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Name"><input required value={materialForm.name} onChange={(event) => setMaterialForm({ ...materialForm, name: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Category"><select required value={materialForm.material_category_id} onChange={(event) => setMaterialForm({ ...materialForm, material_category_id: event.target.value })} className={fieldInputClass}>{categoryOptions}</select></FormField>
          <FormField label="Supplier"><select value={materialForm.supplier_id} onChange={(event) => setMaterialForm({ ...materialForm, supplier_id: event.target.value })} className={fieldInputClass}><option value="">No supplier</option>{supplierOptions}</select></FormField>
          <FormField label="Unit"><select value={materialForm.unit} onChange={(event) => setMaterialForm({ ...materialForm, unit: event.target.value })} className={fieldInputClass}>{materialUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></FormField>
          <FormField label="Location"><input value={materialForm.storage_location} onChange={(event) => setMaterialForm({ ...materialForm, storage_location: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Purchase Price"><input type="number" min="0" step="0.01" value={materialForm.purchase_price} onChange={(event) => setMaterialForm({ ...materialForm, purchase_price: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Selling Price"><input type="number" min="0" step="0.01" value={materialForm.selling_price} onChange={(event) => setMaterialForm({ ...materialForm, selling_price: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Current Stock"><input type="number" step="0.01" value={materialForm.current_stock} onChange={(event) => setMaterialForm({ ...materialForm, current_stock: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Minimum Stock"><input type="number" min="0" step="0.01" value={materialForm.minimum_stock} onChange={(event) => setMaterialForm({ ...materialForm, minimum_stock: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Notes" className="md:col-span-2"><textarea value={materialForm.notes} onChange={(event) => setMaterialForm({ ...materialForm, notes: event.target.value })} className={fieldInputClass} /></FormField>
          <div className="flex gap-2 md:col-span-2"><Button>{editingMaterial ? "Update Material" : "Save Material"}</Button>{editingMaterial && <Button type="button" variant="outline" onClick={() => { setEditingMaterial(null); setMaterialForm(emptyMaterial); }}>Clear</Button>}</div>
        </form>
      </Card>
      <Card className="p-5">
        <Table columns={[
          { key: "name", label: "Material", render: (row) => <div><b>{row.name}</b><p className="text-xs text-brand-muted">{row.code || "No code"} - {row.category}</p></div> },
          { key: "supplier", label: "Supplier" },
          { key: "stock", label: "Stock", render: (row) => <b>{row.currentStock} {row.unit}</b> },
          { key: "minimumStock", label: "Minimum" },
          { key: "purchasePrice", label: "Cost", render: (row) => currency(row.purchasePrice) },
          { key: "stockStatus", label: "Status", render: (row) => <Badge>{row.stockStatus}</Badge> },
          { key: "actions", label: "Actions", render: (row) => <div className="flex gap-2"><Button variant="outline" className="px-3 py-2" onClick={() => { setEditingMaterial(row); setMaterialForm({ ...emptyMaterial, ...row.raw }); }}>Edit</Button><Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => window.confirm(`Delete ${row.name}?`) && deleteMaterial(row.id).then(load)}>Delete</Button></div> },
        ]} rows={materials} />
      </Card>
    </div>}

    {active === "Movements" && <Card className="p-5">
      <h2 className="text-xl font-bold">Stock In / Out / Adjustment</h2>
      <form onSubmit={submitMovement} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_180px_140px_140px_1fr_auto]">
        <select value={movementForm.material_id} onChange={(event) => setMovementForm({ ...movementForm, material_id: event.target.value })} className={fieldInputClass}>{materialOptions}</select>
        <select value={movementForm.type} onChange={(event) => setMovementForm({ ...movementForm, type: event.target.value })} className={fieldInputClass}><option>Stock In</option><option>Stock Out</option><option>Adjustment</option></select>
        <input type="number" step="0.01" value={movementForm.quantity} onChange={(event) => setMovementForm({ ...movementForm, quantity: event.target.value })} className={fieldInputClass} />
        <input type="number" min="0" step="0.01" value={movementForm.unit_cost} onChange={(event) => setMovementForm({ ...movementForm, unit_cost: event.target.value })} className={fieldInputClass} />
        <input placeholder="Notes" value={movementForm.notes} onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} className={fieldInputClass} />
        <Button>Save</Button>
      </form>
      <div className="mt-5">
        <Table columns={[
          { key: "material", label: "Material" },
          { key: "type", label: "Type", render: (row) => <Badge>{row.type}</Badge> },
          { key: "quantity", label: "Qty" },
          { key: "unitCost", label: "Unit Cost", render: (row) => currency(row.unitCost) },
          { key: "totalCost", label: "Total", render: (row) => currency(row.totalCost) },
          { key: "project", label: "Project" },
          { key: "movementDate", label: "Date" },
          { key: "createdBy", label: "Created By" },
        ]} rows={movements} />
      </div>
    </Card>}

    {active === "Purchase Orders" && <Card className="p-5">
      <h2 className="text-xl font-bold">Purchase Orders</h2>
      <form onSubmit={submitPurchaseOrder} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select required value={poForm.supplier_id} onChange={(event) => setPoForm({ ...poForm, supplier_id: event.target.value })} className={fieldInputClass}>{supplierOptions}</select>
          <input type="date" value={poForm.order_date} onChange={(event) => setPoForm({ ...poForm, order_date: event.target.value })} className={fieldInputClass} />
          <input type="date" value={poForm.expected_date} onChange={(event) => setPoForm({ ...poForm, expected_date: event.target.value })} className={fieldInputClass} />
          <input placeholder="Notes" value={poForm.notes} onChange={(event) => setPoForm({ ...poForm, notes: event.target.value })} className={fieldInputClass} />
        </div>
        {poForm.items.map((item, index) => <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_140px_auto]">
          <select value={item.material_id} onChange={(event) => updatePoItem(setPoForm, index, "material_id", event.target.value)} className={fieldInputClass}>{materialOptions}</select>
          <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updatePoItem(setPoForm, index, "quantity", event.target.value)} className={fieldInputClass} />
          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updatePoItem(setPoForm, index, "unit_price", event.target.value)} className={fieldInputClass} />
          <Button type="button" variant="outline" onClick={() => setPoForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</Button>
        </div>)}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setPoForm((current) => ({ ...current, items: [...current.items, { material_id: materials[0]?.id || "", quantity: 1, unit_price: materials[0]?.purchasePrice || "" }] }))}>Add Item</Button><Button>Create Purchase Order</Button></div>
      </form>
      <div className="mt-5">
        <Table columns={[
          { key: "orderNumber", label: "PO Number", render: (row) => <b>{row.orderNumber}</b> },
          { key: "supplier", label: "Supplier" },
          { key: "orderDate", label: "Order Date" },
          { key: "expectedDate", label: "Expected" },
          { key: "totalAmount", label: "Total", render: (row) => currency(row.totalAmount) },
          { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
          { key: "actions", label: "Actions", render: (row) => <div className="flex gap-2"><Button className="px-3 py-2" disabled={row.status === "Received"} onClick={() => receivePurchaseOrder(row.id).then(load)}>Receive</Button><Button variant="outline" className="px-3 py-2 text-brand-danger" disabled={row.status === "Cancelled"} onClick={() => cancelPurchaseOrder(row.id).then(load)}>Cancel</Button></div> },
        ]} rows={purchaseOrders} />
      </div>
    </Card>}

    {active === "Suppliers" && <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.5fr]">
      <Card className="p-5">
        <h2 className="text-xl font-bold">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
        <form onSubmit={saveSupplier} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Name"><input required value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Category"><input value={supplierForm.category} onChange={(event) => setSupplierForm({ ...supplierForm, category: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Contact"><input value={supplierForm.contact_person} onChange={(event) => setSupplierForm({ ...supplierForm, contact_person: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Phone"><input value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Email"><input type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="City"><input value={supplierForm.city} onChange={(event) => setSupplierForm({ ...supplierForm, city: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Opening Balance"><input type="number" step="0.01" value={supplierForm.opening_balance} onChange={(event) => setSupplierForm({ ...supplierForm, opening_balance: event.target.value })} className={fieldInputClass} /></FormField>
          <FormField label="Status"><select value={supplierForm.status} onChange={(event) => setSupplierForm({ ...supplierForm, status: event.target.value })} className={fieldInputClass}><option>Active</option><option>Inactive</option><option>Pending Delivery</option><option>Delivered</option><option>Partial</option></select></FormField>
          <FormField label="Address" className="md:col-span-2"><textarea value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} className={fieldInputClass} /></FormField>
          <div className="flex gap-2 md:col-span-2"><Button>{editingSupplier ? "Update Supplier" : "Save Supplier"}</Button>{editingSupplier && <Button type="button" variant="outline" onClick={() => { setEditingSupplier(null); setSupplierForm(emptySupplier); }}>Clear</Button>}</div>
        </form>
      </Card>
      <Card className="p-5">
        <Table columns={[
          { key: "name", label: "Supplier", render: (row) => <div><b>{row.name}</b><p className="text-xs text-brand-muted">{row.category}</p></div> },
          { key: "contactPerson", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "balance", label: "Balance", render: (row) => currency(row.balance) },
          { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
          { key: "actions", label: "Actions", render: (row) => <div className="flex gap-2"><Button variant="outline" className="px-3 py-2" onClick={() => { setEditingSupplier(row); setSupplierForm({ ...emptySupplier, ...row.raw }); }}>Edit</Button><Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => window.confirm(`Delete ${row.name}?`) && deleteSupplier(row.id).then(load)}>Delete</Button></div> },
        ]} rows={suppliers} />
      </Card>
    </div>}

    {active === "Reports" && <Reports reports={reports} overview={overview} />}
  </div>;
}

function InventoryDashboard({ overview }) {
  const cards = [
    ["Total Materials", overview?.total_materials],
    ["Low Stock", overview?.low_stock_materials],
    ["Out of Stock", overview?.out_of_stock_materials],
    ["Suppliers", overview?.total_suppliers],
    ["Pending POs", overview?.pending_purchase_orders],
    ["Inventory Value", currency(overview?.total_inventory_value)],
  ];
  return <div className="space-y-5">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <Card key={label} className="p-5"><p className="text-sm text-brand-muted">{label}</p><b className="mt-2 block text-2xl text-brand-primary">{value ?? 0}</b></Card>)}</div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5"><h2 className="mb-4 text-xl font-bold">Low Stock Materials</h2><Table columns={[{ key: "name", label: "Material" }, { key: "current_stock", label: "Stock" }, { key: "minimum_stock", label: "Minimum" }, { key: "stock_status", label: "Status", render: (row) => <Badge>{row.stock_status}</Badge> }]} rows={overview?.low_stock || []} /></Card>
      <Card className="p-5"><h2 className="mb-4 text-xl font-bold">Recent Movements</h2><Table columns={[{ key: "material", label: "Material", render: (row) => row.material?.name || "-" }, { key: "type", label: "Type", render: (row) => <Badge>{row.type}</Badge> }, { key: "quantity", label: "Qty" }, { key: "movement_date", label: "Date" }]} rows={overview?.recent_movements || []} /></Card>
    </div>
  </div>;
}

function Reports({ reports, overview }) {
  const stockRows = reports.stockReport?.materials || [];
  const supplierRows = reports.supplierReport || [];
  const categoryRows = overview?.stock_value_by_category || [];
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <Card className="p-5"><h2 className="mb-4 text-xl font-bold">Stock Levels</h2><Table columns={[{ key: "name", label: "Material" }, { key: "category", label: "Category", render: (row) => row.category?.name || "-" }, { key: "current_stock", label: "Stock" }, { key: "minimum_stock", label: "Minimum" }, { key: "stock_value", label: "Value", render: (row) => currency(row.stock_value) }]} rows={stockRows} /></Card>
    <Card className="p-5"><h2 className="mb-4 text-xl font-bold">Supplier Balances</h2><Table columns={[{ key: "supplier", label: "Supplier", render: (row) => row.supplier?.name || "-" }, { key: "balance", label: "Balance", render: (row) => currency(row.balance?.balance || 0) }, { key: "payments_total", label: "Paid", render: (row) => currency(row.balance?.payments_total || 0) }]} rows={supplierRows} /></Card>
    <Card className="p-5 xl:col-span-2"><h2 className="mb-4 text-xl font-bold">Stock Value by Category</h2><Table columns={[{ key: "category", label: "Category" }, { key: "value", label: "Value", render: (row) => currency(row.value) }]} rows={categoryRows} /></Card>
  </div>;
}

function updatePoItem(setPoForm, index, key, value) {
  setPoForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
}

function currency(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
