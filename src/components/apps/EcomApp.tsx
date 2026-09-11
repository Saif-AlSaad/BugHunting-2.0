import { useState } from "react";
import type { TestEnvState, ConsoleEntry, NetworkEntry } from "../../types";
import { cn } from "../../utils/cn";
import { sound } from "../../utils/audio";

interface EcomAppProps {
  env: TestEnvState;
  hasBug: (id: string) => boolean;
  checkBug: (id: string) => void;
  onStateChange: (fn: (s: TestEnvState) => TestEnvState) => void;
  addConsoleLog: (log: Omit<ConsoleEntry, "id" | "timestamp">) => void;
  addNetworkLog: (entry: Omit<NetworkEntry, "id" | "timestamp">) => void;
}

const PRODUCTS = [
  { id: "p1", name: "Pro Mechanical Keyboard", price: 89.99, tag: "Peripherals", rating: 4.8, icon: "⌨️" },
  { id: "p2", name: "Ultra Thunderbolt 4 Hub", price: 49.50, tag: "Accessories", rating: 4.6, icon: "🔌" },
  { id: "p3", name: "Ergonomic Monitor Arm", price: 65.00, tag: "Furniture", rating: 4.9, icon: "🖥️" },
  { id: "p4", name: "4K AI Streaming Webcam", price: 79.99, tag: "Cameras", rating: 4.7, icon: "📷" },
];

export default function EcomApp({
  env,
  hasBug,
  checkBug,
  onStateChange,
  addConsoleLog,
  addNetworkLog,
}: EcomAppProps) {
  const [view, setView] = useState<"catalog" | "cart" | "checkout">("catalog");
  const [couponInput, setCouponInput] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const filteredProducts = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Search trigger (testing wishlist bug ecom-05)
  const handleSearch = (term: string) => {
    setSearchFilter(term);
    if (term.length > 0 && env.wishlist.length > 0 && hasBug("ecom-05")) {
      checkBug("ecom-05");
      addConsoleLog({
        type: "error",
        message: `[StateLossBug] Search query re-render purged wishlist state cache! ${env.wishlist.length} saved item(s) lost.`,
      });
      onStateChange(s => ({ ...s, wishlist: [] }));
    }
  };

  const addToCart = (product: typeof PRODUCTS[0]) => {
    sound.playClick();
    const existing = env.cart.find(c => c.id === product.id);
    let updatedCart: typeof env.cart;
    if (existing) {
      updatedCart = env.cart.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
    } else {
      updatedCart = [...env.cart, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    }

    addNetworkLog({
      method: "POST",
      url: "/api/v1/cart/items",
      status: 200,
      timeMs: 42,
      requestPayload: { productId: product.id, qty: 1 },
      response: JSON.stringify({ success: true, cartSize: updatedCart.length }),
    });

    onStateChange(s => ({ ...s, cart: updatedCart }));
  };

  const handleQtyChange = (id: string, rawVal: string) => {
    const qty = parseInt(rawVal, 10);
    if (isNaN(qty)) return;

    if (qty <= 0) {
      if (hasBug("ecom-01")) {
        checkBug("ecom-01");
        addConsoleLog({
          type: "error",
          message: `[NegativeQuantityVulnerability] Cart item '${id}' set to quantity: ${qty}. Price calculation will yield negative balance!`,
        });
      }
    }

    if (qty >= 99999) {
      if (hasBug("ecom-06")) {
        checkBug("ecom-06");
        addConsoleLog({
          type: "error",
          message: `[IntegerOverflowException] Extreme quantity ${qty} resulted in price float precision breakdown or negative total.`,
        });
      }
    }

    const updated = env.cart.map(c => c.id === id ? { ...c, qty } : c);
    onStateChange(s => ({ ...s, cart: updated }));
  };

  const removeCartItem = (id: string) => {
    sound.playClick();
    onStateChange(s => ({ ...s, cart: s.cart.filter(c => c.id !== id) }));
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const code = couponInput.trim().toUpperCase();

    if (code !== "SAVE10") {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/coupons/validate",
        status: 404,
        timeMs: 35,
        requestPayload: { coupon: code },
        response: JSON.stringify({ valid: false, message: "Coupon code not found." }),
      });
      return;
    }

    if (env.couponApplied) {
      if (hasBug("ecom-02")) {
        checkBug("ecom-02");
        const nextCount = env.couponCount + 1;
        addConsoleLog({
          type: "error",
          message: `[CouponStackingVulnerability] Coupon 'SAVE10' applied repeatedly! Current stack count: ${nextCount}x (${nextCount * 10}% off).`,
        });
        addNetworkLog({
          method: "POST",
          url: "/api/v1/coupons/validate",
          status: 200,
          timeMs: 40,
          requestPayload: { coupon: "SAVE10", stackCount: nextCount },
          response: JSON.stringify({ valid: true, stacked: true, discountRate: 0.1 * nextCount }),
        });
        onStateChange(s => ({ ...s, couponCount: nextCount }));
      } else {
        addConsoleLog({ type: "warn", message: "Coupon 'SAVE10' already applied to this order." });
      }
    } else {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/coupons/validate",
        status: 200,
        timeMs: 45,
        requestPayload: { coupon: "SAVE10" },
        response: JSON.stringify({ valid: true, discount: "10%" }),
      });
      onStateChange(s => ({ ...s, couponApplied: true, couponCount: 1 }));
    }
  };

  // Calculations
  const rawSubtotal = env.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountMultiplier = env.couponCount > 0 ? Math.pow(0.9, env.couponCount) : 1;
  let computedTotal = rawSubtotal * discountMultiplier;

  // ecom-03 calculation bug: extra 0.47 added secretly
  if (hasBug("ecom-03") && env.cart.length > 0) {
    computedTotal = Math.round((computedTotal + 0.47) * 100) / 100;
  }

  const handlePlaceOrder = () => {
    sound.playClick();
    const hasItems = env.cart.length > 0;
    const noAddress = !env.address.trim();

    if (!hasItems) return;

    if (hasBug("ecom-03") && env.cart.length > 0) {
      checkBug("ecom-03");
      addConsoleLog({
        type: "error",
        message: `[PricingDiscrepancy] Checkout total mismatch: Math expected $${(rawSubtotal * discountMultiplier).toFixed(2)}, but system billed $${computedTotal.toFixed(2)} (+0.47 unlisted surcharge).`,
      });
    }

    if (noAddress && hasBug("ecom-04")) {
      checkBug("ecom-04");
      addConsoleLog({
        type: "error",
        message: `[ValidationBypass] Order dispatched without shipping address destination! Null address accepted.`,
      });
      addNetworkLog({
        method: "POST",
        url: "/api/v1/orders/checkout",
        status: 201,
        timeMs: 55,
        requestPayload: { items: env.cart, shippingAddress: "", total: computedTotal },
        response: JSON.stringify({ orderId: "ord_null_addr_8921", status: "confirmed" }),
      });
      setOrderSuccess(true);
      onStateChange(s => ({ ...s, cart: [], couponApplied: false, couponCount: 0 }));
    } else if (noAddress) {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/orders/checkout",
        status: 422,
        timeMs: 32,
        requestPayload: { shippingAddress: "" },
        response: JSON.stringify({ error: "Shipping address is required." }),
      });
      alert("Please enter a valid shipping address.");
    } else {
      addNetworkLog({
        method: "POST",
        url: "/api/v1/orders/checkout",
        status: 201,
        timeMs: 65,
        requestPayload: { items: env.cart, shippingAddress: env.address, total: computedTotal },
        response: JSON.stringify({ orderId: "ord_success_9918", status: "confirmed" }),
      });
      setOrderSuccess(true);
      onStateChange(s => ({ ...s, cart: [], couponApplied: false, couponCount: 0, address: "" }));
    }
  };

  return (
    <div className="animate-fade-in py-2">
      {/* Top Store Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛍️</span>
          <div>
            <h2 className="text-xl font-black text-white font-sans tracking-tight">ShopWave</h2>
            <p className="text-[11px] text-slate-400">High-Performance Tech & Workspace Gear</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <div className="relative w-full">
            <input
              type="text"
              value={searchFilter}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search products (e.g. keyboard)..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
            {searchFilter && (
              <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("catalog")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "catalog" ? "bg-slate-800 text-sky-300 border border-slate-700" : "text-slate-400 hover:text-white"
            )}
          >
            Catalog
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setView("cart");
            }}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              view === "cart" || view === "checkout" ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-300 border border-slate-700 hover:text-white"
            )}
          >
            <span>🛒 Cart</span>
            {env.cart.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {env.cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Coupon promo banner */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
        <span className="flex items-center gap-2">
          <span>🏷️</span>
          <span>Special QA Promo: Use promo code <strong>SAVE10</strong> at checkout for 10% off!</span>
        </span>
      </div>

      {/* PRODUCT CATALOG VIEW */}
      {view === "catalog" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map(product => {
            const inWishlist = env.wishlist.includes(product.id);
            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl transition-all hover:border-slate-700 hover:shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      {product.tag}
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        const next = inWishlist
                          ? env.wishlist.filter(w => w !== product.id)
                          : [...env.wishlist, product.id];
                        onStateChange(s => ({ ...s, wishlist: next }));
                      }}
                      className={cn("text-sm transition-transform active:scale-125", inWishlist ? "text-rose-400" : "text-slate-600 hover:text-slate-400")}
                      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      ♥
                    </button>
                  </div>

                  <div className="my-4 flex h-24 items-center justify-center rounded-xl bg-slate-950/80 text-5xl">
                    {product.icon}
                  </div>

                  <h3 className="font-semibold text-white text-sm group-hover:text-sky-300 transition-colors">
                    {product.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                    <span>★</span>
                    <span>{product.rating}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-3">
                  <span className="font-mono text-base font-bold text-white">
                    ${product.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    className="rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition-all active:scale-95"
                  >
                    + Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CART VIEW */}
      {view === "cart" && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-lg font-bold text-white font-sans">Shopping Cart ({env.cart.length} unique items)</h3>
            <button onClick={() => setView("catalog")} className="text-xs text-sky-400 hover:underline">
              ← Continue Shopping
            </button>
          </div>

          {env.cart.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <span className="text-4xl block mb-2">🛒</span>
              <p className="text-sm">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-slate-800">
                {env.cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                      <p className="font-mono text-xs text-slate-400">${item.price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-slate-400">Qty:</label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={e => handleQtyChange(item.id, e.target.value)}
                          className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-white text-center focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <span className="w-20 text-right font-mono text-sm font-bold text-white">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="flex gap-2 pt-3 border-t border-slate-800">
                <input
                  type="text"
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                  placeholder="Enter discount coupon (e.g. SAVE10)"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-sky-500 focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-semibold text-sky-300 transition-colors"
                >
                  Apply Coupon
                </button>
              </form>

              {env.couponCount > 0 && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs text-emerald-300 flex items-center justify-between">
                  <span>Coupon 'SAVE10' applied ({env.couponCount}x stacked discount!)</span>
                  <span className="font-mono font-bold">-{(100 - discountMultiplier * 100).toFixed(0)}%</span>
                </div>
              )}

              {/* Price summary */}
              <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>${rawSubtotal.toFixed(2)}</span>
                </div>
                {env.couponCount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-${(rawSubtotal - rawSubtotal * discountMultiplier).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Due:</span>
                  <span className="text-emerald-300">${computedTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setView("checkout");
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                Proceed to Checkout →
              </button>
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT VIEW */}
      {view === "checkout" && (
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
          {orderSuccess ? (
            <div className="py-8 text-center animate-fade-in">
              <span className="text-5xl block mb-3">📦</span>
              <h3 className="text-xl font-bold text-emerald-300">Order Placed Successfully!</h3>
              <p className="text-xs text-slate-400 mt-2">Order tracking ID: <strong className="font-mono text-white">ORD-948210-QA</strong></p>
              <button
                onClick={() => {
                  setOrderSuccess(false);
                  setView("catalog");
                }}
                className="mt-6 rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Return to Storefront
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Checkout & Shipping</h3>
                <button onClick={() => setView("cart")} className="text-xs text-sky-400 hover:underline">
                  ← Back to Cart
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Shipping Street Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={env.address}
                  onChange={e => onStateChange(s => ({ ...s, address: e.target.value }))}
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Try testing if orders can be placed with an empty address.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-sky-500/50 bg-sky-500/10 p-3 text-xs text-sky-200 font-semibold flex items-center gap-2">
                    <span>💳 Credit Card (Instant QA Mock)</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-500">
                    <span>📱 Apple Pay (Demo)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs flex justify-between items-center">
                <span className="text-slate-400">Total Billed:</span>
                <span className="text-lg font-bold text-emerald-300">${computedTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99]"
              >
                Complete Order
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
