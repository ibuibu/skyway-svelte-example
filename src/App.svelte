<script lang="ts">
  import { onMount } from "svelte";
  import {
    LocalAudioStream,
    LocalVideoStream,
    nowInSec,
    SkyWayAuthToken,
    SkyWayContext,
    SkyWayRoom,
    SkyWayStreamFactory,
    uuidV4,
    type RoomPublication,
  } from "@skyway-sdk/room";

  export let appId: string;
  export let secretKey: string;
  let localVideo: HTMLVideoElement | null = null;
  let buttonArea: HTMLDivElement | null = null;
  let remoteMediaArea: HTMLDivElement | null = null;
  let roomNameInput = "";
  let myId = "";

  const token = new SkyWayAuthToken({
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    scope: {
      app: {
        id: appId,
        turn: true,
        actions: ["read"],
        channels: [
          {
            id: "*",
            name: "*",
            actions: ["write"],
            members: [
              {
                id: "*",
                name: "*",
                actions: ["write"],
                publication: {
                  actions: ["write"],
                },
                subscription: {
                  actions: ["write"],
                },
              },
            ],
            sfuBots: [
              {
                actions: ["write"],
                forwardings: [
                  {
                    actions: ["write"],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  }).encode(secretKey);

  let audioGlobal: LocalAudioStream | null = null;
  let videoGlobal: LocalVideoStream | null = null;
  onMount(async () => {
    const { audio, video } =
      await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    audioGlobal = audio;
    videoGlobal = video;

    if (!localVideo) throw new Error("localVideo is unset");
    video.attach(localVideo);
    await localVideo.play();
  });

  async function join() {
    if (roomNameInput === "") return;
    const context = await SkyWayContext.Create(token);
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: "p2p",
      name: roomNameInput,
    });
    const me = await room.join();

    myId = me.id;

    if (audioGlobal === null || videoGlobal === null)
      throw new Error("audio or video is unset");

    await me.publish(audioGlobal);
    await me.publish(videoGlobal);

    const subscribeAndAttach = (publication: RoomPublication) => {
      if (publication.publisher.id === me.id) return;

      const subscribeButton = document.createElement("button");
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;

      if (!buttonArea || !remoteMediaArea)
        throw new Error("buttonArea or remoteMediaArea is unset");

      buttonArea.appendChild(subscribeButton);

      subscribeButton.onclick = async () => {
        const { stream } = await me.subscribe(publication.id);

        if (stream.contentType === "data") return;

        let newMedia;
        switch (stream.track.kind) {
          case "video":
            newMedia = document.createElement("video");
            newMedia.playsInline = true;
            newMedia.autoplay = true;
            break;
          case "audio":
            newMedia = document.createElement("audio");
            newMedia.controls = true;
            newMedia.autoplay = true;
            break;
          default:
            return;
        }
        stream.attach(newMedia);
        remoteMediaArea.appendChild(newMedia);
      };
    };

    room.publications.forEach(subscribeAndAttach);

    room.onStreamPublished.add((e) => {
      subscribeAndAttach(e.publication);
    });
  }
</script>

<main>
  <p>ID: {myId}</p>
  <div>
    room name: <input id="room-name" type="text" bind:value={roomNameInput} />
    <button id="join" on:click={join}>join</button>
  </div>
  <video
    id="local-video"
    width="400px"
    muted
    playsinline
    bind:this={localVideo}
  />
  <div id="button-area" bind:this={buttonArea} />
  <div id="remote-media-area" bind:this={remoteMediaArea} />
</main>
