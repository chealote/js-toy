const SERVER_URL = "http://localhost:3000";

const TABLE_STATUS = {
  OCCUPIED: "occupied",
  FREE: "free",
  CANCELLING: "cancelling",
};

const DEFAULT_TABLE = {
  id: 0,
  status: TABLE_STATUS.FREE,
  items: [],
};

async function fetchItems() {
  const response = await fetch(`${SERVER_URL}/items`);
  return response.json();
}

async function fetchCurrentTables() {
  const response = await fetch(`${SERVER_URL}/tables`);
  const tables = await response.json();
  localStorage.setItem("tables", JSON.stringify(tables));
  return tables;
}

async function addTable() {
  const tables = await fetchCurrentTables();
  const nextTable = DEFAULT_TABLE;
  nextTable.id = tables.reduce((maxId, table) => {
    if (table.id > maxId) {
      return table.id;
    }
    return maxId;
  }, tables[0].id);
  nextTable.id += 1;
  tables.push(nextTable);
  await updateCurrentTables(tables);
  renderTables();
}

async function removeTable() {
  let tables = await fetchCurrentTables();
  tables = tables.slice(0, tables.length-1);
  await updateCurrentTables(tables);
  renderTables();
}

async function updateCurrentTables(tables) {
  await fetch(`${SERVER_URL}/tables`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(tables),
  });
}

// async function prepareTables(ntables) {
//   let tables = await fetchCurrentTables();
//   if (ntables < tables.length) {
//     tables = tables.slice(0, ntables);
//   } else {
//     for (let i=0; i<ntables; i++) {
//       if (tables[i]) {
//         continue;
//       }

//       const defaultTable = structuredClone(DEFAULT_TABLE);
//       defaultTable.id = i+1;
//       tables.push(defaultTable);
//     }
//   }

//   await updateCurrentTables(tables);
//   renderTables();
// }

async function renderTables() {
  const tables = await fetchCurrentTables();
  const layout = document.getElementById("layout");
  layout.innerHTML = "";
  for (const t of tables) {
    const div = document.createElement("div");
    div.classList.add("table");
    div.classList.add(t.status);
    div.onclick = function() {
      renderDetails(t.id);
    };
    div.innerHTML = `Table ${t.id} <br /> ${t.status}`;
    layout.appendChild(div);
  }
}

async function occupyTable(tableId) {
  const tables = await fetchCurrentTables();
  const table = tables.filter(t => t.id === tableId)[0];
  table.status = TABLE_STATUS.OCCUPIED;
  await updateCurrentTables(tables);
  renderTables();
  renderDetails(tableId);
}

async function toggleItemTable(tableId, item, itemPrice) {
  const price = document.getElementById("totalPrice");
  const tables = await fetchCurrentTables();
  const table = tables.filter(t => t.id === tableId)[0];
  if (table.items.indexOf(item) >= 0) {
    table.items.splice(table.items.indexOf(item), 1);
    const total = Number(price.value) - Number(itemPrice);
    price.value = total;
  } else {
    table.items.push(item);
    const total = Number(price.value) + Number(itemPrice);
    price.value = total;
  }
  await updateCurrentTables(tables);
  console.log(tables);
}

async function freeTable(tableId) {
  const tables = await fetchCurrentTables();
  const table = tables.filter(t => t.id === tableId)[0];
  table.status = TABLE_STATUS.FREE;
  table.items = [];
  await updateCurrentTables(tables);
  renderTables();
  renderDetails(tableId);
}

async function cancelTable(tableId) {
  const tables = await fetchCurrentTables();
  const table = tables.filter(t => t.id === tableId)[0];
  table.status = TABLE_STATUS.CANCELLING;
  await updateCurrentTables(tables);
  renderTables();
  renderDetails(tableId);
}

async function renderItemsInDetails(table) {
  const detailsDiv = document.getElementById("details");
  const items = await fetchItems();

  for (const i of items) {
    const d = document.createElement("div");
    const c = document.createElement("input");
    c.type = "checkbox";
    c.value = i.name;
    c.onclick = async function() {
      await toggleItemTable(table.id, i.name, i.price);
    };
    c.checked = table.items.indexOf(i.name) >= 0;
    c.disabled = table.status === TABLE_STATUS.CANCELLING;

    i.checked = c.checked;

    const p = document.createElement("span");
    p.innerHTML = i.name;

    d.appendChild(c);
    d.appendChild(p);
    detailsDiv.appendChild(d);
  }

  const totalPrice = items.filter(i => i.checked).reduce((acc, i) => {
    return acc + Number(i.price);
  }, 0);

  const tl = document.createElement("label");
  tl.for = "totalPrice";
  tl.innerHTML = "Total $";

  const t = document.createElement("input");
  t.disabled = true;
  t.id = "totalPrice";
  t.value = totalPrice;
  detailsDiv.appendChild(tl);
  detailsDiv.appendChild(t);
}

async function renderDetailsIfCancelling(table) {
  const detailsDiv = document.getElementById("details");

  if (table.status === TABLE_STATUS.CANCELLING) {
    const payed = document.createElement("button");
    payed.innerHTML = "Pay";
    payed.onclick = async function() {
      await freeTable(table.id);
    };
    detailsDiv.appendChild(payed);
  } else {
    const cancel = document.createElement("button");
    cancel.innerHTML = "Cancel";
    cancel.onclick = async function() {
      await cancelTable(table.id);
    }
    const close = document.createElement("button");
    close.innerHTML = "Close";
    close.onclick = function() {
      freeTable(table.id);
    }

    detailsDiv.appendChild(cancel);
    detailsDiv.appendChild(close);
  }
}

async function renderDetails(tableId) {
  const tables = await fetchCurrentTables();
  const detailsDiv = document.getElementById("details");
  detailsDiv.innerHTML = "";
  const table = tables.filter(t => t.id === tableId)[0];
  detailsDiv.innerHTML = `Table selected: ${table.id}<br/>`;
  if (table.status === TABLE_STATUS.FREE) {
    detailsDiv.innerHTML += `<button onclick="occupyTable(${table.id})">Occupy table</button>`;
  } else {
    await renderItemsInDetails(table);
    renderDetailsIfCancelling(table);
  }
}

function toggleError(toggle) {
  const error = document.getElementById("error");
  if (toggle) {
    error.style.display = "block";
    error.innerHTML = "server is not running maybe or other error";
  } else {
    error.style.display = "none";
    error.innerHTML = "";
  }
}

async function isServiceRunning() {
  try {
    const response = await fetch(`${SERVER_URL}/status`);
    toggleError(! response.ok);
    return response.ok;
  } catch (err) {
    toggleError(true);
  }
}

if (isServiceRunning()) {
  renderTables();
}
