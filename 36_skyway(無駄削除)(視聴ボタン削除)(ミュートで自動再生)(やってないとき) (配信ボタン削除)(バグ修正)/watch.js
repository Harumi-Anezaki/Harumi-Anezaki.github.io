// watch.js

const { SkyWayContext, SkyWayRoom } = skyway_room;

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZTBjZjUwMi1kYTIxLTQ5NWItYmE0OC0wYmIwMzBkZDMzOWIiLCJpYXQiOjE3NTI2NzUzOTYsImV4cCI6MTc1Mjc2MTc5Niwic2NvcGUiOnsiYXBwIjp7ImlkIjoiNzJhNDZiODUtNDJlZC00Y2VhLWE1MzktZDFmOTNiZGE5NTRkIiwiYWN0aW9ucyI6WyJyZWFkIl0sImNoYW5uZWxzIjpbeyJpZCI6IioiLCJuYW1lIjoiKiIsImFjdGlvbnMiOlsid3JpdGUiXSwibWVtYmVycyI6W3siaWQiOiIqIiwibmFtZSI6IioiLCJhY3Rpb25zIjpbIndyaXRlIl0sInB1YmxpY2F0aW9uIjp7ImFjdGlvbnMiOlsid3JpdGUiXX0sInN1YnNjcmlwdGlvbiI6eyJhY3Rpb25zIjpbIndyaXRlIl19fV0sInNmdUJvdHMiOlt7ImFjdGlvbnMiOlsid3JpdGUiXSwiZm9yd2FyZGluZ3MiOlt7ImFjdGlvbnMiOlsid3JpdGUiXX1dfV19XSwidHVybiI6dHJ1ZX19fQ.E5T_3wk5ZVjM-K-rlcK5E8jurLoQ97vY4hHrr-85a8c'; 

// ページの準備ができたら自動で処理を開始
window.onload = async () => {
    const remoteArea = document.getElementById('remote-area');

    const context = await SkyWayContext.Create(token);
    const room = await SkyWayRoom.FindOrCreate(context, {
        type: 'sfu',
        name: 'a', // ルーム名を 'a' に固定
    });
    const me = await room.join();

    let hasReceivedVideoStream = false; // 映像ストリームを受信したかどうかのフラグ

    // ★ここが視聴のキモ！★
    // 部屋にいる他の人の配信をすべて受け取って画面に表示する関数
    const subscribeAndAttach = async (publication) => {
        // 自分の配信は無視
        if (publication.publisher.id === me.id) {
            return;
        }

        // ここで一旦すべての publication を購読します
        const { stream } = await me.subscribe(publication.id);

        // 購読したストリームが映像(video)の場合のみ処理を行う
        if (stream.track.kind === 'video') { // ★★★ この行を stream.track.kind に戻す ★★★
            hasReceivedVideoStream = true; // 映像ストリームを受信したのでフラグを立てる

            // videoタグをプログラムで新しく作る
            const newVideo = document.createElement('video');
            newVideo.playsInline = true;
            newVideo.autoplay = true; // 自動再生
            newVideo.controls = true; // 再生・停止ボタンなどを表示
            newVideo.muted = true; // ミュートにすることで自動再生を許可させる
            // 受け取った映像を、作ったvideoタグに流し込む
            stream.attach(newVideo);
            // 画面に表示する
            remoteArea.appendChild(newVideo);
        }
        // ここに else if (stream.track.kind === 'audio') のような処理は不要なので、音声は表示されません。
    };
    
    // 1. 部屋に入った時点ですでに始まっている配信をすべて受け取る
    room.publications.forEach(subscribeAndAttach);

    // 2. 部屋に入った後に新しく始まる配信も受け取るように待機する
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));

    // 数秒待って、もし映像ストリームがまだ来ていなければアラートを表示
    setTimeout(() => {
        if (!hasReceivedVideoStream) {
            alert('現在、ライブ配信されていません。');
        }
    }, 3000); // 3秒待機（この秒数は調整可能です）
};