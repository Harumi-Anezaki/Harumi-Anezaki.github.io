// server.js (Node.js + Express)
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000; // ポート番号

app.use(express.static('.')); // カレントディレクトリを静的ファイルとして公開


// ファイルリスト取得API
app.get('/get-files', (req, res) => {
    const folderPath = req.query.folder;

    fs.readdir(folderPath, { withFileTypes: true }, (err, files) => { // withFileTypes を true に
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'フォルダの読み込みに失敗しました' });
        }

        const audioFiles = files
            .filter(dirent => dirent.isFile() && /\.(mp3|wav|ogg|m4a)$/i.test(dirent.name)) // isFile()でファイルのみ、拡張子チェック
            .map(dirent => path.join(folderPath, dirent.name).replace(/\\/g, '/')); // 絶対パス、バックスラッシュをスラッシュに

        res.json({ files: audioFiles });
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});