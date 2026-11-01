import TinySMF from './TinySMF.js';
import EventFilter from './EventFilter.js';
import EventDispatcher from './EventDispatcher.js';

class SMFToMML {
  constructor(smfBuffer) {
    const smf = TinySMF.read(smfBuffer);
    if (smf.header.format !== 0 && smf.header.format !== 1) {
      throw `Format ${smf.header.format} is not supported.`;
    }
    if (smf.header.division & 0x8000) {
      throw 'SMPTE format is not supported.';
    }
    const tpqn = smf.header.division;

    let tempoTrack = [];
    let tracks = [];
    let title = null;

    if (smf.header.format === 0) {
      const singleTrack = smf.tracks[0] || [];
      const channelEvents = Array.from({ length: 16 }, () => []);
      const channelHasNotes = Array(16).fill(false);
      let endOfTrackEvent = null;

      for (const event of singleTrack) {
        if (event.group === TinySMF.Group.META_EVENT_MESSAGE) {
          tempoTrack.push(event);
          if (event.type === TinySMF.Type.SEQUENCE_TRACK_NAME && !title) {
            title = event.data;
          }
          if (event.type === TinySMF.Type.END_OF_TRACK) {
            endOfTrackEvent = event;
          }
        } else if (event.channel !== undefined) {
          channelEvents[event.channel].push(event);
          if (event.type === TinySMF.Type.NOTE_ON && event.velocity > 0) {
            channelHasNotes[event.channel] = true;
          }
        } else {
          tempoTrack.push(event);
        }
      }

      for (let ch = 0; ch < 16; ch++) {
        if (channelHasNotes[ch]) {
          const chTrack = channelEvents[ch];
          if (endOfTrackEvent) {
            chTrack.push({ ...endOfTrackEvent });
          }
          tracks.push(chTrack);
        }
      }
    } else {
      // Format 1
      tempoTrack = smf.tracks[0] || [];
      const track0HasNotes = tempoTrack.some(
        (ev) => ev.type === TinySMF.Type.NOTE_ON && ev.velocity > 0
      );
      tracks = track0HasNotes ? smf.tracks : smf.tracks.slice(1);
    }

    const trackInfo = tracks.map((track, idx) => {
      let name;
      let totalNotes = 0;
      let poly = 0;
      let maxPoly = 0;
      let ticks = 0;
      for (const event of track) {
        switch (event.type) {
          case TinySMF.Type.SEQUENCE_TRACK_NAME:
          case TinySMF.Type.INSTRUMENT_NAME:
            name = name || event.data;
            break;
          case TinySMF.Type.NOTE_ON:
            totalNotes++;
            poly++;
            maxPoly = Math.max(maxPoly, poly);
            break;
          case TinySMF.Type.NOTE_OFF:
            poly--;
            break;
          case TinySMF.Type.END_OF_TRACK:
            ticks = Math.ceil(48 * event.time / tpqn);
            break;
        }
      }
      return { name, totalNotes, maxPoly, ticks };
    });

    if (smf.header.format === 1) {
      for (const event of tempoTrack) {
        if (event.type === TinySMF.Type.SEQUENCE_TRACK_NAME) {
          title = title || event.data;
          break;
        }
      }
    }

    this._tpqn = tpqn;
    this._title = title;
    this._trackInfo = trackInfo;
    this._tempoTrack = tempoTrack;
    this._tracks = tracks;
  }

  get trackInfo() {
    return this._trackInfo;
  }

  get title() {
    return this._title;
  }

  convert(trackNumber, numChannels, withTempo, volume, transpose, detune) {
    const iTPQN = this._tpqn;
    const oTPQN = 48;
    const srcTempo = new EventFilter(
      withTempo ? this._tempoTrack : [], iTPQN, oTPQN);
    const srcTarget = new EventFilter(
      this._tracks[trackNumber], iTPQN, oTPQN);
    const dispatcher = new EventDispatcher(
      numChannels, volume, transpose * 64 + detune);
    let ticks = 0;
    while (true) {
      dispatcher.dispatch(srcTempo.next());
      dispatcher.dispatch(srcTarget.next());
      if (srcTarget.completed) {
        break;
      }
      dispatcher.next();
      ticks++;
    }
    return { mml: dispatcher.render(), ticks };
  }
}

export default SMFToMML;
