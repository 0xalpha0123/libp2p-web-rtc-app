import PeerId from "peer-id";

export async function getOrCreatePeerId() {
  let peerId;
  try {
    peerId = JSON.parse(localStorage.getItem("peerId"));
    peerId = await PeerId.createFromJSON(peerId);
  } catch (err) {
    console.info(
      "Could not get the stored peer id, a new one will be generated",
      err,
    );
    peerId = await PeerId.create();
    localStorage.setItem("peerId", JSON.stringify(peerId.toJSON()));
  }

  return peerId;
}
