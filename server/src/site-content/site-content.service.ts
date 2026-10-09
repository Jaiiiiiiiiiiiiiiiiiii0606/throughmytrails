import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { FIXED_SLOTS, TEAM_SLOT_PREFIX, TRIP_SLOT_PREFIX } from '../common/constants';
import { Media, MediaDocument } from '../media/media.schema';
import { DEFAULT_CONTACT, DEFAULT_SERVICES, DEFAULT_TEAM, DEFAULT_TRIP_TYPES } from './defaults';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';
import { Contact, SiteContent, SiteContentDocument, TeamMember } from './site-content.schema';

export interface SlotImage {
  mediaId: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

@Injectable()
export class SiteContentService {
  constructor(
    @InjectModel(SiteContent.name) private readonly model: Model<SiteContentDocument>,
    @InjectModel(Media.name) private readonly media: Model<MediaDocument>,
  ) {}

  /** Returns the single content document, creating it with defaults on first use. */
  async getDoc(): Promise<SiteContentDocument> {
    const doc = await this.model.findOneAndUpdate(
      { key: 'main' },
      {
        $setOnInsert: {
          key: 'main',
          slots: {},
          tripTypes: DEFAULT_TRIP_TYPES,
          services: DEFAULT_SERVICES,
          contact: DEFAULT_CONTACT,
          team: DEFAULT_TEAM,
        },
      },
      { upsert: true, new: true },
    );
    return doc!;
  }

  async getContact(): Promise<Contact> {
    const doc = await this.getDoc();
    return { ...DEFAULT_CONTACT, ...doc.toObject().contact };
  }

  private team(doc: SiteContentDocument): TeamMember[] {
    return doc.toObject().team ?? DEFAULT_TEAM;
  }

  private async resolveSlots(doc: SiteContentDocument): Promise<Record<string, SlotImage>> {
    const entries = [...(doc.slots?.entries() ?? [])].filter(([, id]) => !!id);
    if (!entries.length) return {};
    const media = await this.media.find({ _id: { $in: entries.map(([, id]) => id) } }).lean();
    const byId = new Map(media.map((m) => [String(m._id), m]));
    const out: Record<string, SlotImage> = {};
    for (const [slot, id] of entries) {
      const m = byId.get(String(id));
      if (m) out[slot] = { mediaId: String(m._id), url: m.url, alt: m.alt, width: m.width, height: m.height };
    }
    return out;
  }

  /** Shape consumed by the public website. Hidden trip types are omitted. */
  async getPublic() {
    const doc = await this.getDoc();
    const slots = await this.resolveSlots(doc);
    const img = (s?: SlotImage) => (s ? { url: s.url, alt: s.alt, width: s.width, height: s.height } : null);
    return {
      images: {
        hero: img(slots.hero),
        about: img(slots.about),
        logo: img(slots.logo),
      },
      tripTypes: doc.tripTypes
        .filter((t) => t.visible)
        .map((t) => ({
          key: t.key,
          title: t.title,
          subtitle: t.subtitle,
          whatsappMessage: t.whatsappMessage,
          illustration: t.illustration,
          image: img(slots[TRIP_SLOT_PREFIX + t.key]),
        })),
      services: doc.services.map((s) => ({ icon: s.icon, title: s.title, description: s.description })),
      team: this.team(doc)
        .filter((m) => m.visible)
        .map((m) => ({ key: m.key, name: m.name, role: m.role, bio: m.bio, image: img(slots[TEAM_SLOT_PREFIX + m.key]) })),
      contact: await this.getContact(),
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    };
  }

  /** Full shape for the admin editor, including hidden trip types and media ids. */
  async getAdmin() {
    const doc = await this.getDoc();
    const plain = doc.toObject();
    return {
      slots: await this.resolveSlots(doc),
      slotNames: this.slotNames(plain.tripTypes.map((t) => t.key), this.team(doc).map((m) => m.key)),
      tripTypes: plain.tripTypes,
      services: plain.services,
      team: this.team(doc),
      contact: { ...DEFAULT_CONTACT, ...plain.contact },
    };
  }

  private slotNames(tripKeys: string[], teamKeys: string[]) {
    return [...FIXED_SLOTS, ...tripKeys.map((k) => TRIP_SLOT_PREFIX + k), ...teamKeys.map((k) => TEAM_SLOT_PREFIX + k)];
  }

  /** Removes image slots under `prefix` whose key is no longer in `keys`. */
  private dropOrphanSlots(doc: SiteContentDocument, prefix: string, keys: string[]) {
    for (const slot of [...doc.slots.keys()]) {
      if (slot.startsWith(prefix) && !keys.includes(slot.slice(prefix.length))) doc.slots.delete(slot);
    }
  }

  async update(dto: UpdateSiteContentDto) {
    const doc = await this.getDoc();

    if (dto.tripTypes) {
      const keys = dto.tripTypes.map((t) => t.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) throw new BadRequestException(`Trip key "${dup}" is used more than once.`);
      this.dropOrphanSlots(doc, TRIP_SLOT_PREFIX, keys);
      doc.tripTypes = dto.tripTypes;
    }

    if (dto.team) {
      const keys = dto.team.map((m) => m.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) throw new BadRequestException(`Team member key "${dup}" is used more than once.`);
      this.dropOrphanSlots(doc, TEAM_SLOT_PREFIX, keys);
      doc.team = dto.team;
    }

    if (dto.slots) {
      const allowed = new Set(this.slotNames(doc.tripTypes.map((t) => t.key), this.team(doc).map((m) => m.key)));
      const ids: string[] = [];
      for (const [slot, id] of Object.entries(dto.slots)) {
        if (!allowed.has(slot)) throw new BadRequestException(`Unknown image slot "${slot}".`);
        if (id !== null && !isValidObjectId(id)) throw new BadRequestException(`Invalid media id for slot "${slot}".`);
        if (id) ids.push(id);
      }
      if (ids.length) {
        const found = await this.media.countDocuments({ _id: { $in: [...new Set(ids)] } });
        if (found !== new Set(ids).size) throw new BadRequestException('One or more selected images no longer exist.');
      }
      for (const [slot, id] of Object.entries(dto.slots)) {
        if (id) doc.slots.set(slot, new Types.ObjectId(id));
        else doc.slots.delete(slot);
      }
    }

    if (dto.services) doc.services = dto.services;
    if (dto.contact) doc.contact = dto.contact;

    doc.markModified('slots');
    await doc.save();
    return this.getAdmin();
  }

  /** Slot names currently pointing at this media item. */
  async findUsages(mediaId: string): Promise<string[]> {
    const doc = await this.getDoc();
    return [...doc.slots.entries()].filter(([, id]) => String(id) === String(mediaId)).map(([slot]) => slot);
  }

  async usageMap(): Promise<Map<string, string[]>> {
    const doc = await this.getDoc();
    const map = new Map<string, string[]>();
    for (const [slot, id] of doc.slots.entries()) {
      const k = String(id);
      map.set(k, [...(map.get(k) ?? []), slot]);
    }
    return map;
  }

  async unassignMedia(mediaId: string): Promise<void> {
    const doc = await this.getDoc();
    let changed = false;
    for (const [slot, id] of [...doc.slots.entries()]) {
      if (String(id) === String(mediaId)) {
        doc.slots.delete(slot);
        changed = true;
      }
    }
    if (changed) {
      doc.markModified('slots');
      await doc.save();
    }
  }
}
