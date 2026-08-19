# FindUpto POS — Beginner Tutorial

Welcome to the project. This tutorial is for a new owner, manager, cashier or developer who is starting with the POS for the first time.

## 1. The basic idea

The system has two different kinds of stock:

- **Raw/ingredient stock:** milk, mango, cream, sugar, cheese, mayonnaise, chicken, rice, oil, spices, cups, buns, etc.
- **Menu/finished products:** pizza, burger, shawarma, shake, biryani, cold drink, etc.

A menu item can have a **recipe**. When that menu item is sold, its recipe ingredients are consumed automatically.

The important flow is:

```text
Purchase / Opening Stock
        ↓
Ingredient Stock
        ↓
Recipes
        ↓
Menu Items / Deals
        ↓
POS Sale
        ↓
Recipe Consumption
        ↓
Remaining Ingredient Stock
```

---

## 2. First login

Use the login screen to enter the account supplied by the business administrator.

After login, learn these main areas:

| Area | Purpose |
|---|---|
| Dashboard | Sales, expenses, dues and low-stock overview |
| POS | Sell products |
| Products | Create/import the menu |
| Inventory | View current stock and stock value |
| Purchases | Add purchased stock |
| Deals | Manage bundle/combination deals |
| Sales | Review completed sales |
| Analytics | Sales and profit analysis |
| Reports | Business reports |
| Settings | Business information, printer and backup |

---

## 3. Set up the business first

Open **Settings** and confirm:

- Business name
- Address
- Phone
- Currency
- Tax, if used
- Thermal printer, if used

Save the settings before entering a large menu.

---

## 4. Create your ingredients / stock items

Before building recipes, make sure the ingredients exist as stock items.

Example:

| Ingredient | Opening Stock | Unit |
|---|---:|---|
| Milk | 1,000 | ml/g according to your stock convention |
| Mango | 1,000 | g |
| Cream | 500 | g |
| Sugar | 1,000 | g |
| Cheese | 10,000 | g |
| Mayonnaise | 5,000 | g |
| Chicken | 20,000 | g |
| Rice | 50,000 | g |

### Unit rule

Pick a consistent base unit. For recipe calculations, small base units are usually easiest:

- Weight → grams
- Liquid → millilitres
- Countable items → pieces

For example, do not make one recipe use `0.5 kg` and another use `500 g` unless the application is explicitly converting those units. Keeping stock in grams makes calculations predictable.

---

## 5. Create menu products

Now create the items customers actually buy.

Examples:

- Chicken Pizza Small
- Chicken Pizza Medium
- Chicken Pizza Large
- Chicken Pizza XL
- Zinger Burger
- Chicken Shawarma
- Mango Shake Small
- Mango Shake Large
- Biryani 250g
- Cold Drink 500ml

Give each product a unique SKU.

Example:

```text
PIZ-CS
PIZ-CM
PIZ-CL
PIZ-CXL
BUR-ZINGER
SHAW-CHICKEN
SHAKE-MANGO-S
SHAKE-MANGO-L
BIRYANI-250
DRINK-500
```

---

## 6. Build a recipe

A recipe tells the system what one sale consumes.

### Example: Small Mango Shake

```text
Milk   200 ml
Mango  100 g
Cream   30 g
Sugar   25 g
```

### Example: Large Mango Shake

```text
Milk   300 ml
Mango  150 g
Cream   45 g
Sugar   35 g
```

The recipe quantity means **per one menu item sold**.

If you sell 10 Large Mango Shakes, the system should calculate:

```text
Milk   10 × 300 ml = 3,000 ml
Mango  10 × 150 g  = 1,500 g
Cream  10 × 45 g   = 450 g
Sugar  10 × 35 g   = 350 g
```

The ingredient stock is then reduced by those amounts.

---

## 7. How the limiting ingredient works

Suppose you have:

```text
Milk   1,000 ml
Mango  1,000 g
Cream    500 g
Sugar  1,000 g
```

For a Large Mango Shake:

```text
Milk   300 ml
Mango  150 g
Cream   45 g
Sugar   35 g
```

Theoretical capacity is:

```text
Milk   → 3 shakes
Mango  → 6 shakes
Cream  → 11 shakes
Sugar  → 28 shakes
```

Therefore the maximum is **3 Large Mango Shakes**, because milk is the limiting ingredient.

This is why you should not maintain a separate manual "shake stock" count for a recipe-based product.

---

## 8. Pizza with Small / Medium / Large / XL

Create a separate product/recipe for each size when the ingredient quantities differ.

Example:

| Ingredient | Small | Medium | Large | XL |
|---|---:|---:|---:|---:|
| Dough | 180g | 250g | 350g | 450g |
| Cheese | 80g | 120g | 170g | 230g |
| Sauce | 50g | 70g | 100g | 130g |

If today's sales are:

```text
10 Small
15 Medium
20 Large
5 XL
```

The system conceptually calculates:

```text
10 × Small recipe
+ 15 × Medium recipe
+ 20 × Large recipe
+ 5 × XL recipe
```

That gives the total ingredient demand for the day.

---

## 9. Burger and Shawarma

Example Zinger Burger recipe:

```text
Bun             1 pc
Chicken         150 g
Cheese           1 slice
Mayonnaise      20 g
Lettuce         15 g
Sauce           15 g
```

Selling 50 Zinger Burgers consumes approximately:

```text
Bun        50 pcs
Chicken    7,500 g
Cheese     50 slices
Mayonnaise 1,000 g
Lettuce    750 g
Sauce      750 g
```

The same mayonnaise, cheese or chicken can also be used by other recipes. All those sales reduce the same underlying stock.

---

## 10. Deals / Combos

A deal is a bundle of existing products.

Example:

```text
Zinger Deal
├── Zinger Burger × 1
├── Fries × 1
└── Cold Drink × 1
```

The deal is sold as one POS item, but its component stock is what determines availability.

If you have:

```text
Zinger Burger = 20
Fries         = 30
Cold Drink    = 50
```

then the deal can be produced/sold at most **20 times** because the burger is the limiting component.

---

## 11. Bulk menu import

The Products area supports CSV import.

A useful CSV structure is:

```csv
name,sku,barcode,category,cost,price,tax,stock,stockUnit,type,status,recipe
Milk Shake Small,SHAKE-MANGO-S,,Shakes,120,250,0,0,pcs,product,active,
Milk Shake Large,SHAKE-MANGO-L,,Shakes,160,350,0,0,pcs,product,active,
Zinger Burger,BUR-ZINGER,,Burgers,300,550,0,0,pcs,product,active,
Fries,SIDE-FRIES,,Sides,80,200,0,0,pcs,product,active,
Cold Drink,DRINK-500,,Drinks,55,100,0,50,pcs,product,active,
```

For recipe data, the application can represent recipe entries in the exported/imported recipe field using the recipe format supported by the current POS data layer.

### Deals in bulk import

You can identify a deal as a deal/bundle and provide its components. Examples of deal wording include:

```text
Zinger Deal
Family Deal
Pizza Combo
Burger Meal
Party Pack
```

The importer attempts to detect deal rows and match their components against imported menu products by SKU or product name.

Example concept:

```text
Zinger Deal = Zinger Burger + Fries + Cold Drink
```

Recognized deals are separated into the **Deals** area and represented as bundle products for POS stock calculations.

### Important import rule

Import the normal menu products in the same CSV before relying on automatic deal matching. If the importer cannot safely identify at least two components, review the deal manually rather than allowing the system to guess.

---

## 12. Biryani and batch production

Biryani is often prepared in batches instead of one plate at a time.

Example production batch:

```text
50 kg cooked biryani
```

The batch may use:

```text
Rice       20 kg
Chicken    15 kg
Oil         5 L
Masala      2 kg
Onion       4 kg
Other       remaining ingredients
```

After production, the kitchen has a finished batch of 50 kg.

If customers consume 20 kg during the day:

```text
50 kg produced
−20 kg sold
=30 kg remaining
```

For businesses that prepare batches in advance, treat the finished batch as a semi-finished/finished stock item and keep its production record separate from raw ingredients when that matches the kitchen workflow.

---

## 13. How a sale changes stock

When a recipe-based product is sold, the important stock change is its ingredient consumption.

Example:

```text
Sell 1 Large Mango Shake

Milk   -300 ml
Mango  -150 g
Cream   -45 g
Sugar   -35 g
```

For a deal:

```text
Sell 1 Zinger Deal

Zinger Burger -1
Fries         -1
Cold Drink    -1
```

For a normal stock item with no recipe, the product's own stock is reduced.

---

## 14. Expected stock vs physical stock

At the end of the day, compare the theoretical quantity with the physical count.

Example:

```text
Opening cheese       10.0 kg
Expected consumption   5.0 kg
Expected remaining     5.0 kg
Physical count         4.6 kg
Variance              -0.4 kg
```

A variance can be caused by:

- Waste
- Over-portioning
- Preparation loss
- Wrong recipe quantities
- Damaged stock
- Incorrect opening/purchase entry
- Stock leakage

Large repeated variances should be investigated instead of simply changing the stock number.

---

## 15. Calculate demand for purchasing

Use sales history to estimate daily ingredient consumption.

Example:

```text
Average pizzas sold per day = 50
Average cheese per pizza    = 150 g
```

Daily cheese demand:

```text
50 × 150 g = 7,500 g = 7.5 kg/day
```

For 7 days:

```text
7 × 7.5 kg = 52.5 kg
```

If usable cheese already in stock is 15 kg:

```text
52.5 − 15 = 37.5 kg
```

A simple purchasing target would therefore be about **37.5 kg for the next 7 days**, before adding your safety stock.

For better planning, calculate demand from the actual sales mix of Small, Medium, Large and XL pizzas rather than using one average when the sizes have very different recipes.

---

## 16. Daily operating routine

### Opening

1. Check ingredient stock.
2. Record purchases received.
3. Confirm prepared batch stock such as biryani if applicable.
4. Check low-stock warnings.
5. Confirm the POS menu is active.

### During the day

1. Sell through POS.
2. Do not manually deduct recipe ingredients after every sale.
3. Record genuine waste or stock adjustments separately.
4. Watch low-stock ingredients.

### Closing

1. Check sales totals.
2. Count important physical ingredients.
3. Compare physical stock with expected stock.
4. Investigate major variances.
5. Review tomorrow's demand and purchasing needs.

---

## 17. Developer onboarding

If you are a developer starting this project, the most important files are:

```text
src/main.jsx             Main application and navigation
src/businessModules.jsx  Products, purchases, deals and business modules
src/posData.js           State, recipes, inventory calculations and persistence
src/styles.css           Application styling
src/PrinterBridge.js     Thermal printer integration
src/Tutorial.jsx         Beginner in-app tutorial content
```

### Inventory logic

The recipe engine lives in `src/posData.js`.

Important functions include:

```text
normalizeRecipe()
recipeForProduct()
recipeConsumption()
availableRecipeUnits()
consumeSaleIngredients()
autoDetectDeals()
normalizeStateDeals()
saveState()
```

### Before changing inventory logic

Always understand this relationship first:

```text
Product
  └── recipe[]
        ├── ingredientId
        ├── quantity
        ├── unit
        └── wastePercent
```

A recipe should reference an existing stock product/ingredient by ID rather than duplicating the stock quantity inside the recipe.

### Before changing deal logic

A deal has component references:

```text
Deal
 ├── id
 ├── name
 ├── bundlePrice
 └── components[]
       ├── productId
       ├── quantity
       └── cost
```

This allows available deal stock to be calculated from its components.

---

## 18. Safe testing checklist

Before using the system with real stock, test these cases:

### Recipe test

Create a shake with known quantities and confirm that one sale consumes exactly one recipe quantity.

### Limiting ingredient test

Give a recipe three ingredients with different stock levels and confirm the available quantity is controlled by the smallest capacity.

### Shared ingredient test

Use the same cheese in pizza and burger recipes. Sell both and confirm cheese is reduced by both recipes.

### Deal test

Create a deal with burger + fries + drink. Confirm available deals equal the smallest component capacity.

### Bulk import test

Import normal products and a deal together. Confirm normal products remain in Products and the recognized deal appears separately in Deals.

### Shortage test

Try a recipe where an ingredient is almost empty. Confirm the shortage is visible in the audit/inventory information rather than silently creating negative stock.

### Backup test

Use Settings → Backup and verify that a JSON backup can be downloaded before making major configuration changes.

---

## 19. Golden rule

**Never try to manually maintain finished-product stock when the product is recipe-driven. Maintain the ingredient stock and let sales calculate consumption.**

For example:

```text
Milk 1 kg
Mango 1 kg
Cream .5 kg
Sugar 1 kg
        ↓
Mango Shake Recipe
        ↓
POS sells Small/Large quantities
        ↓
Exact ingredient consumption
        ↓
Remaining stock
```

That is the foundation of the inventory system.
