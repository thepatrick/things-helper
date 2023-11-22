// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process unless
// nodeIntegration is set to true in webPreferences.
// Use preload.js to selectively enable features
// needed in the renderer process.

// splitStream came from https://streams.spec.whatwg.org/demos/append-child.html
function splitStream(splitOn: string) {
  let buffer = "";

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const parts = buffer.split(splitOn);
      parts.slice(0, -1).forEach((part) => controller.enqueue(part));
      buffer = parts[parts.length - 1];
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer);
    },
  });
}

function filterStream(prefix: string) {
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      if (chunk.startsWith(prefix)) {
        controller.enqueue(chunk.substring(prefix.length));
      } else {
        console.log(
          `[${chunk}] is not one of mine, it does not start with [${prefix}]`
        );
      }
    },
  });
}
// function logWritableStream() {
//   return new WritableStream<string>({
//     write(chunk) {
//       console.log("chunk", chunk);
//     },
//   });
// }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
  API: {
    scannedBarcode(
      code: string,
      mode: "tab" | "enter" | "open"
    ): Promise<undefined>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function testIt() {
  const filters = [
    // the 2D Desktop Barcode Scanner I have
    { usbVendorId: 0x067b, usbProductId: 0x2303 },
    { usbVendorId: 0x1a86, usbProductId: 0x5723 },
  ];

  const deviceNameEl = document.getElementById("device-name");
  const codeEl = document.getElementById("code");

  try {
    const port = await navigator.serial.requestPort({ filters });
    const portInfo = port.getInfo();

    deviceNameEl.innerHTML = "OK"; //  `vendorId: ${portInfo.usbVendorId} | productId: ${portInfo.usbProductId} `;

    await port.open({ baudRate: 9600 });

    const reader = port.readable
      .pipeThrough(new TextDecoderStream("utf-8"))
      .pipeThrough(splitStream("\r"))
      .pipeThrough(filterStream("URL:https://a.twopats.live/"))
      .getReader();

    // Listen to data coming from the serial device.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      console.log("await reader.read()");
      const { value, done } = await reader.read();
      if (done) {
        console.log("is done");
        // Allow the serial port to be closed later.
        reader.releaseLock();
        break;
      }

      const mode = document.querySelector<HTMLInputElement>(
        'input[name="action"][type="radio"]:checked'
      )?.value;

      if (!(mode === "open" || mode === "tab" || mode === "enter")) {
        console.log("impossible mode", mode);
      } else {
        await window.API.scannedBarcode(value, mode);
      }

      codeEl.innerText = value;
    }
  } catch (ex) {
    console.log("ex", ex);
    if (ex.name === "NotFoundError") {
      deviceNameEl.innerHTML = "Device NOT found";
    } else {
      deviceNameEl.innerHTML = ex;
    }
  }
}
