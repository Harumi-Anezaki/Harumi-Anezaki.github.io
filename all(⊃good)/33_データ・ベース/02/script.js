let db;
const dbName = "myDatabase";
const storeName = "data";
let columns = []; // {name: "列名", type: "text|number|checkbox|date"} の配列

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
      console.error("IndexedDB error:", event.target.error); // エラー詳細
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
    request.onerror = (event) => {
      console.error("Error adding data:", event.target.error);
      reject(event.target.error);
    };
  });
};

// データを更新
const updateData = (data) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error("Error updating data:", event.target.error);
      reject(event.target.error);
    };
  });
};

// データを削除
const deleteData = (id) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error("Error deleting data:", event.target.error);
      reject(event.target.error);
    };
  });
};

// すべてのデータを取得
const getAllData = () => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error("Error getting data:", event.target.error);
      reject(event.target.error);
    };
  });
};

// 列定義をUIに表示、入力フォームを生成
const renderColumns = () => {
  const columnList = document.getElementById("columnList");
  const inputForm = document.getElementById("inputForm");

  columnList.innerHTML = "";
  inputForm.innerHTML = "";

  columns.forEach((column) => {
    // 列名リスト
    const listItem = document.createElement("li");
    listItem.textContent = `${column.name} (${column.type})`;
    columnList.appendChild(listItem);

    // 入力フォーム
    const inputField = createInputField(column); // 列の型に応じた入力要素を作成
    inputForm.appendChild(inputField);
  });
};

// 列の型に応じた入力要素を作成する関数
const createInputField = (column) => {
    const inputField = document.createElement("div"); // inputをdivでラップ
    inputField.classList.add("input-field-container");
    let input;

    switch (column.type) {
        case "number":
            input = document.createElement("input");
            input.type = "number";
            input.placeholder = column.name;
            input.dataset.column = column.name;
            break;
        case "checkbox":
            input = document.createElement("input");
            input.type = "checkbox";
            input.dataset.column = column.name;
            // ラベルを追加 (チェックボックスだけだと小さくて押しにくい)
            const label = document.createElement("label");
            label.textContent = column.name;
            label.htmlFor = `checkbox-${column.name}`; // idは動的に
            input.id = `checkbox-${column.name}`;     // idを設定
            inputField.appendChild(input);
            inputField.appendChild(label);
            return inputField; // labelがあるのでreturn
        case "date":
            input = document.createElement("input");
            input.type = "date";
            input.placeholder = column.name;
            input.dataset.column = column.name;
            break;
        case "text":
        default:
            input = document.createElement("input");
            input.type = "text";
            input.placeholder = column.name;
            input.dataset.column = column.name;
    }
     inputField.appendChild(input);
     return inputField;

};

// テーブルのヘッダー行を生成
const renderTableHeader = () => {
    const headerRow = document.getElementById("headerRow");
    headerRow.innerHTML = "";

    columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column.name;
        headerRow.appendChild(th);
    });

    const deleteTh = document.createElement("th");
    deleteTh.textContent = "Action";
    headerRow.appendChild(deleteTh);
};

// テーブルのデータ行を生成
const renderTableData = (data) => {
  const dataBody = document.getElementById("dataBody");
  dataBody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((column) => {
      const td = document.createElement("td");
      const value = row[column.name] ;

      // データ型に応じた表示
      switch (column.type) {
        case "checkbox":
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = !!value; // 真偽値に変換
          checkbox.disabled = true;  // 表示用なのでdisabled
          td.appendChild(checkbox);
          break;
        case "date":
           // Dateオブジェクトを文字列に
          td.textContent = value ? new Date(value).toLocaleDateString() : "";
          break;
        default:
          td.textContent = value|| "";
      }

      td.classList.add("editable");
      td.dataset.id = row.id;
      td.dataset.column = column.name;
      td.dataset.type = column.type; // データ型も保持
      td.addEventListener("click", handleCellClick);
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
    deleteTd.appendChild(deleteButton);
    tr.appendChild(deleteTd);

    dataBody.appendChild(tr);
  });
};

// セルクリック時の処理 (インプレース編集)
function handleCellClick(event) {
  const cell = event.target;
  // チェックボックスの場合は編集不可
  if (cell.dataset.type === "checkbox") {
    return;
  }

  const currentValue = cell.textContent;
  let input;

    switch(cell.dataset.type){
        case "number":
            input = document.createElement("input");
            input.type = "number";
            input.value = currentValue;
            break;
        case "date":
             input = document.createElement("input");
            input.type = "date";
            input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : ""; //"YYYY-MM-DD"形式
            break;

        case "text":
        default:
            input = document.createElement("input");
            input.type = "text";
            input.value = currentValue;
    }

  input.classList.add("edit-input");

  cell.textContent = "";
  cell.appendChild(input);
  input.focus();

  const finishEditing = () => {
    let newValue = input.value;
      // 型に合わせた変換
    if (cell.dataset.type === "number") {
        newValue = parseFloat(newValue); // 数値に
        if (isNaN(newValue)) {
          newValue = ""; // 数値に変換できない場合は空にする（必要に応じて）
        }
    } else if(cell.dataset.type === "date"){
         newValue = input.value ? new Date(input.value).getTime() : null;
    }
    cell.textContent = newValue;

    const rowId = parseInt(cell.dataset.id);
    const column = cell.dataset.column;

     getAllData().then((allData) => {
        const dataToUpdate = allData.find((item) => item.id === rowId);
        if (dataToUpdate) {
          dataToUpdate[column] = newValue;
          updateData(dataToUpdate)
            .then(() => {
                // チェックボックスの場合は、表示を更新する必要がある
                if (cell.dataset.type === "checkbox") {
                    loadAndRenderData();
                }
            })
            .catch((error) => console.error("Error updating data:", error));
        }
      });
  };


  input.addEventListener("blur", finishEditing);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      finishEditing();
    }
  });
}

// データ読み込み/表示
const loadAndRenderData = () => {
  if (columns.length === 0) {
    return;
  }
  renderTableHeader();
  getAllData()
    .then((data) => renderTableData(data))
    .catch((error) => console.error("Error getting data:", error));
};

// イベントリスナー
document.addEventListener("DOMContentLoaded", () => {
  openDB()
    .then(() => {
      //loadAndRenderData(); // 既存のデータがあれば表示
    })
    .catch((error) => console.error("Error opening database:", error));

  // 列追加
  const addColumnButton = document.getElementById("addColumnButton");
  addColumnButton.addEventListener("click", () => {
    const columnNameInput = document.getElementById("columnName");
    const columnTypeSelect = document.getElementById("columnType");
    const columnName = columnNameInput.value.trim();
    const columnType = columnTypeSelect.value;

    if (columnName) {
      columns.push({ name: columnName, type: columnType });
      columnNameInput.value = "";
      renderColumns();
      loadAndRenderData();
    } else {
      alert("Please enter a column name."); // 簡単なエラー表示
    }
  });

  // 行追加
  const addRowButton = document.getElementById("addRowButton");
  addRowButton.addEventListener("click", () => {
    const inputFields = document.querySelectorAll("#inputForm input");
    const newData = {};
    inputFields.forEach((input) => {
        let value;
        if (input.type === "checkbox") {
            value = input.checked; // チェックボックスの値
        } else if (input.type === "number") {
            value = parseFloat(input.value) ;// 数値
             if (isNaN(value)) {
                value = ""; // 数値に変換できない場合は空にする
            }
        }else if(input.type === "date"){
            value = input.value ? new Date(input.value).getTime(): null; // Dateオブジェクトではなく、ミリ秒単位の数値にする

        }else{
            value = input.value; // その他の場合はそのまま
        }
      newData[input.dataset.column] = value;

    });

    addData(newData)
      .then(() => {
        // input fields のクリアを型ごとに行う
          inputFields.forEach(input => {
            if(input.type === "checkbox"){
                input.checked = false;
            } else{
                input.value = "";
            }
          });
          loadAndRenderData();
      })
      .catch((error) => console.error("Error adding data:", error));
  });
});