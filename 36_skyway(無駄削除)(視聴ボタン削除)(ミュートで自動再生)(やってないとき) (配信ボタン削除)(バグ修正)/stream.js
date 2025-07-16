// stream.js

const { SkyWayContext, SkyWayRoom, SkyWayStreamFactory } = skyway_room;

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ZTBjZjUwMi1kYTIxLTQ5NWItYmE0OC0wYmIwMzBkZDMzOWIiLCJpYXQiOjE3NTI2NzUzOTYsImV4cCI6MTc1Mjc2MTc5Niwic2NvcGUiOnsiYXBwIjp7ImlkIjoiNzJhNDZiODUtNDJlZC00Y2VhLWE1MzktZDFmOTNiZGE5NTRkIiwiYWN0aW9ucyI6WyJyZWFkIl0sImNoYW5uZWxzIjpbeyJpZCI6IioiLCJuYW1lIjoiKiIsImFjdGlvbnMiOlsid3JpdGUiXSwibWVtYmVycyI6W3siaWQiOiIqIiwibmFtZSI6IioiLCJhY3Rpb25zIjpbIndyaXRlIl0sInB1YmxpY2F0aW9uIjp7ImFjdGlvbnMiOlsid3JpdGUiXX0sInN1YnNjcmlwdGlvbiI6eyJhY3Rpb25zIjpbIndyaXRlIl19fV0sInNmdUJvdHMiOlt7ImFjdGlvbnMiOlsid3JpdGUiXSwiZm9yd2FyZGluZ3MiOlt7ImFjdGlvbnMiOlsid3JpdGUiXX1dfV19XSwidHVybiI6dHJ1ZX19fQ.E5T_3wk5ZVjM-K-rlcK5E8jurLoQ97vY4hHrr-85a8c';

// ページの準備ができたら、自動で処理を始めます
window.onload = async () => {

    // HTMLの部品（videoタグ）をプログラムで使えるようにします
    const localVideo = document.getElementById('local-video');

    // まず、自分のPCのカメラの準備をします（音声は含めない）
    const { video } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    
    // 準備した映像を、HTMLのvideoタグに映します
    video.attach(localVideo);
    await localVideo.play();

    // ★カメラの準備ができた直後に、自動で配信を開始する処理 ★
    // SkyWayに接続するための準備をします
    const context = await SkyWayContext.Create(token);

    // ルーム名を 'a' に固定して「部屋（ルーム）」を探すか、なければ新しく作ります
    const room = await SkyWayRoom.FindOrCreate(context, {
        type: 'sfu', // 配信でよく使われるタイプ
        name: 'a',
    });

    // 作った部屋に「入室」します。meは部屋の中の自分の情報です
    const me = await room.join();

    // ★これが「配信」の処理です！★
    // 自分の映像を、部屋にいるみんなに公開します（音声は配信しない）
    await me.publish(video);
};