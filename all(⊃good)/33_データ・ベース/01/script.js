let db;
const dbName = "myDatabase";
const storeName = "data";
let columns = []; // 列定義を保持する配列

// データベースを開く/初期化
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// データを追加
const addData = (data) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.add(data);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// データを更新
const updateData = (data) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(data); // put は更新/追加両方を行う

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// データを削除
const deleteData = (id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

// すべてのデータを取得
const getAllData = () => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};



// 列定義をUIに表示、および入力フォームを生成
const renderColumns = () => {
    const columnList = document.getElementById("columnList");
    const inputForm = document.getElementById("inputForm");

    columnList.innerHTML = ""; // クリア
    inputForm.innerHTML = "";   //クリア

    columns.forEach((column) => {
      // 列名リスト表示
        const listItem = document.createElement("li");
        listItem.textContent = column;
        columnList.appendChild(listItem);

        // 入力フォームの生成
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.placeholder = column;
        inputField.setAttribute("data-column", column); // data属性で列名を保持
        inputForm.appendChild(inputField);

    });
};


// テーブルのヘッダー行を生成
const renderTableHeader = () => {
    const headerRow = document.getElementById("headerRow");
    headerRow.innerHTML = ""; // ヘッダーをクリア

    columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column;
        headerRow.appendChild(th);
    });
    // 削除ボタン用のヘッダー
    const deleteTh = document.createElement("th");
    deleteTh.textContent = "Action";
    headerRow.appendChild(deleteTh);
};


// テーブルのデータ行を生成 (編集可能にする)
const renderTableData = (data) => {
  const dataBody = document.getElementById("dataBody");
  dataBody.innerHTML = ""; // テーブルボディをクリア

  data.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((column) => {
      const td = document.createElement("td");
      td.textContent = row[column] || ""; // データがない場合は空文字
      td.classList.add("editable"); // 編集可能クラスを追加
      td.dataset.id = row.id;     // data属性でidを保持
      td.dataset.column = column; // data属性で列名を保持

      td.addEventListener("click", handleCellClick); // クリックイベント
      tr.appendChild(td);
    });

    // 削除ボタン
    const deleteTd = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteData(row.id)
        .then(() => loadAndRenderData())
        .catch((error) => console.error("Error deleting data:", error));
    });
    deleteTd.appendChild(deleteButton)
    tr.appendChild(deleteTd);

    dataBody.appendChild(tr);
  });
};


// セルクリック時の処理 (インプレース編集)
function handleCellClick(event) {
  const cell = event.target;
  const currentValue = cell.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentValue;
  input.classList.add("edit-input")

  // セルの内容をinputに置き換え
  cell.textContent = "";
  cell.appendChild(input);
  input.focus();

  // inputのフォーカスが外れたら、更新処理
  input.addEventListener("blur", () => {
    const newValue = input.value;
    cell.textContent = newValue; // セルの表示を更新

    const rowId = parseInt(cell.dataset.id); // data属性からidを取得
    const column = cell.dataset.column;    // data属性から列名を取得

    getAllData().then((allData)=>{
      const dataToUpdate = allData.find((item) => item.id === rowId);
      if (dataToUpdate) {
          dataToUpdate[column] = newValue;
          updateData(dataToUpdate)
              .then(() => { /*loadAndRenderData();  再表示はしない*/ })
              .catch((error) => console.error("Error updating data:", error));
        }
    })
  });

  // Enterキーで更新を確定
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur(); // blurイベントをトリガーして更新処理
    }
  });
}

// データの読み込みと表示をまとめた関数
const loadAndRenderData = () => {
    if(columns.length === 0){ //列が定義されていない場合は何もしない
      return;
    }
    renderTableHeader(); // ヘッダーをレンダリング
    getAllData()
        .then((data) => renderTableData(data))
        .catch((error) => console.error("Error getting data:", error));
};


// イベントリスナーなど
document.addEventListener("DOMContentLoaded", () => {
    openDB()
        .then(() => {
            // loadAndRenderData(); // 初期表示
        })
        .catch((error) => console.error("Error opening database:", error));


    // 列追加ボタン
    const addColumnButton = document.getElementById("addColumnButton");
    addColumnButton.addEventListener("click", () => {
        const columnNameInput = document.getElementById("columnName");
        const columnName = columnNameInput.value.trim();
        if (columnName) {
            columns.push(columnName);
            columnNameInput.value = "";
            renderColumns();
            loadAndRenderData(); // 列が追加されたらテーブルを再描画

        }
    });

    // 行追加ボタン
    const addRowButton = document.getElementById("addRowButton");
    addRowButton.addEventListener("click", () => {
        const inputFields = document.querySelectorAll("#inputForm input");
        const newData = {};
        inputFields.forEach((input) => {
          // data-column 属性から列名を取得
          newData[input.dataset.column] = input.value;
          input.value = ""; // 入力欄をクリア
        });

        addData(newData)
            .then(() => loadAndRenderData()) // データ追加後にテーブルを再表示
            .catch((error) => console.error("Error adding data:", error));
    });
});