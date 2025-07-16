// stream.js

const { SkyWayContext, SkyWayRoom, SkyWayStreamFactory } = skyway_room;

// ★ご自身で発行したトークンに書き換えてください★
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZTBjZjUwMi1kYTIxLTQ5NWItYmE0OC0wYmIwMzBkZDMzOWIiLCJpYXQiOjE3NTI2NzUzOTYsImV4cCI6MTc1Mjc2MTc5Niwic2NvcGUiOnsiYXBwIjp7ImlkIjoiNzJhNDZiODUtNDJlZC00Y2VhLWE1MzktZDFmOTNiZGE5NTRkIiwiYWN0aW9ucyI6WyJyZWFkIl0sImNoYW5uZWxzIjpbeyJpZCI6IioiLCJuYW1lIjoiKiIsImFjdGlvbnMiOlsid3JpdGUiXSwibWVtYmVycyI6W3siaWQiOiIqIiwibmFtZSI6IioiLCJhY3Rpb25zIjpbIndyaXRlIl0sInB1YmxpY2F0aW9uIjp7ImFjdGlvbnMiOlsid3JpdGUiXX0sInN1YnNjcmlwdGlvbiI6eyJhY3Rpb25zIjpbIndyaXRlIl19fV0sInNmdUJvdHMiOlt7ImFjdGlvbnMiOlsid3JpdGUiXSwiZm9yd2FyZGluZ3MiOlt7ImFjdGlvbnMiOlsid3JpdGUiXX1dfV19XSwidHVybiI6dHJ1ZX19fQ.E5T_3wk5ZVjM-K-rlcK5E8jurLoQ97vY4hHrr-85a8c';

// ページの準備ができたら、initという名前の処理を始めます
window.onload = async () => {

    // HTMLの部品（ボタンや入力欄など）をプログラムで使えるようにします
    const joinButton = document.getElementById('join');
    const roomNameInput = document.getElementById('room-name');
    const myIdSpan = document.getElementById('my-id');
    const localVideo = document.getElementById('local-video');

    // まず、自分のPCのカメラとマイクの準備をします
    // videoが映像、audioが音声です
    const { audio, video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    
    // 準備した映像を、HTMLのvideoタグに映します
    video.attach(localVideo);
    await localVideo.play();

    // 「配信開始」ボタンがクリックされたときの処理
    joinButton.onclick = async () => {
        // ルーム名が空っぽだったら、アラートを出して処理を中断します
        if (roomNameInput.value === '') {
            return alert('ルーム名を入力してください');
        }

        // SkyWayに接続するための準備をします
        const context = await SkyWayContext.Create(token);

        // 入力された名前の「部屋（ルーム）」を探すか、なければ新しく作ります
        const room = await SkyWayRoom.FindOrCreate(context, {
            type: 'sfu', // 配信でよく使われるタイプ
            name: roomNameInput.value,
        });

        // 作った部屋に「入室」します。meは部屋の中の自分の情報です
        const me = await room.join();
        myIdSpan.textContent = me.id; // 自分のIDを画面に表示します

        // ★これが「配信」の処理です！★
        // 自分の映像と音声を、部屋にいるみんなに公開します
        await me.publish(video);
        await me.publish(audio);

        alert('配信を開始しました！');
    };
};