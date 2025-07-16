// 使う魔法の呪文は同じです
const { SkyWayContext, SkyWayRoom } = skyway_room;

// トークンも同じものを使います（練習のため）
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZTBjZjUwMi1kYTIxLTQ5NWItYmE0OC0wYmIwMzBkZDMzOWIiLCJpYXQiOjE3NTI2NzUzOTYsImV4cCI6MTc1Mjc2MTc5Niwic2NvcGUiOnsiYXBwIjp7ImlkIjoiNzJhNDZiODUtNDJlZC00Y2VhLWE1MzktZDFmOTNiZGE5NTRkIiwiYWN0aW9ucyI6WyJyZWFkIl0sImNoYW5uZWxzIjpbeyJpZCI6IioiLCJuYW1lIjoiKiIsImFjdGlvbnMiOlsid3JpdGUiXSwibWVtYmVycyI6W3siaWQiOiIqIiwibmFtZSI6IioiLCJhY3Rpb25zIjpbIndyaXRlIl0sInB1YmxpY2F0aW9uIjp7ImFjdGlvbnMiOlsid3JpdGUiXX0sInN1YnNjcmlwdGlvbiI6eyJhY3Rpb25zIjpbIndyaXRlIl19fV0sInNmdUJvdHMiOlt7ImFjdGlvbnMiOlsid3JpdGUiXSwiZm9yd2FyZGluZ3MiOlt7ImFjdGlvbnMiOlsid3JpdGUiXX1dfV19XSwidHVybiI6dHJ1ZX19fQ.E5T_3wk5ZVjM-K-rlcK5E8jurLoQ97vY4hHrr-85a8c'; 

// ページの準備ができたら処理を開始
window.onload = () => {
    const joinButton = document.getElementById('join');
    const roomNameInput = document.getElementById('room-name');
    const remoteArea = document.getElementById('remote-area'); // 映像を映す場所

    // 「視聴開始」ボタンがクリックされたときの処理
    joinButton.onclick = async () => {
        if (roomNameInput.value === '') {
            return alert('ルーム名を入力してください');
        }

        const context = await SkyWayContext.Create(token);
        const room = await SkyWayRoom.FindOrCreate(context, {
            type: 'sfu',
            name: roomNameInput.value,
        });
        const me = await room.join();

        alert(`ルーム「${roomNameInput.value}」に参加しました`);

        // ★ここが視聴のキモ！★
        // 部屋にいる他の人の配信をすべて受け取って画面に表示する関数
        const subscribeAndAttach = async (publication) => {
            // 自分の配信は無視
            if (publication.publisher.id === me.id) {
                return;
            }

            // 配信を受け取る（購読する）
            const { stream } = await me.subscribe(publication.id);

            // 種類が映像(video)か音声(audio)かで処理を分ける
            switch (stream.track.kind) {
                case 'video':
                    // videoタグをプログラムで新しく作る
                    const newVideo = document.createElement('video');
                    newVideo.playsInline = true;
                    newVideo.autoplay = true; // 自動再生
                    newVideo.controls = true; // 再生・停止ボタンなどを表示
                    // 受け取った映像を、作ったvideoタグに流し込む
                    stream.attach(newVideo);
                    // 画面に表示する
                    remoteArea.appendChild(newVideo);
                    break;
                case 'audio':
                    // audioタグをプログラムで新しく作る
                    const newAudio = document.createElement('audio');
                    newAudio.autoplay = true;
                    newAudio.controls = true;
                    // 受け取った音声を、作ったaudioタグに流し込む
                    stream.attach(newAudio);
                    // 画面に表示する
                    remoteArea.appendChild(newAudio);
                    break;
            }
        };
        
        // 1. 部屋に入った時点ですでに始まっている配信をすべて受け取る
        room.publications.forEach(subscribeAndAttach);

        // 2. 部屋に入った後に新しく始まる配信も受け取るように待機する
        room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
    };
};