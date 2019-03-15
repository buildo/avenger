import * as t from 'io-ts';
import {
  LocalDate as _LocalDate,
  LocalDateTime as _LocalDateTime
} from 'local-date';

export const LocalDate = new t.Type<_LocalDate, string>(
  'LocalDate',
  (m): m is _LocalDate => m instanceof _LocalDate,
  (m, c) =>
    t.string.validate(m, c).chain(s => {
      try {
        const d = new _LocalDate(s);
        return t.success(d);
      } catch (_) {
        return t.failure(s, c);
      }
    }),
  a => a.toISOString()
);
export type LocalDate = t.TypeOf<typeof LocalDate>;

export const DateFromString = new t.Type<Date, string>(
  'Date',
  (v): v is Date => v instanceof Date,
  (v, c) =>
    t.string.validate(v, c).chain(s => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? t.failure(s, c) : t.success(d);
    }),
  a => a.toISOString()
);

export type Instant = Date;
export const Instant = DateFromString;

export type LocalTime = string;
export const LocalTime = t.string;

export type UUID = string;
export const UUID = t.string;

export type ReservationProfile = 'Leisure' | 'Business' | 'TourOperator';

export const ReservationProfile = t.keyof(
  {
    Leisure: true,
    Business: true,
    TourOperator: true
  },
  'ReservationProfile'
);

export type PaymentMode =
  | 'Cash'
  | 'Prepaid'
  | 'FullCreditVoucher'
  | 'LimitedValueVoucher';

export const PaymentMode = t.keyof(
  {
    Cash: true,
    Prepaid: true,
    FullCreditVoucher: true,
    LimitedValueVoucher: true
  },
  'PaymentMode'
);

export interface OpeningHours {
  open: string;
  close: string;
}

export const OpeningHours = t.interface(
  {
    open: t.string,
    close: t.string
  },
  'OpeningHours'
);

export interface LocationSummary {
  oagCode: string;
  group: string;
  description?: string;
  city: string;
  country?: string;
  phone?: string;
  openingHours: Array<OpeningHours>;
  relevantInfo?: string;
}

export const LocationSummary = t.intersection([
  t.interface({
    oagCode: t.string,
    group: t.string,
    city: t.string,
    openingHours: t.array(OpeningHours)
  }),
  t.partial({
    description: t.string,
    country: t.string,
    phone: t.string,
    relevantInfo: t.string
  })
]);

export interface API_AvailableVehicleSearchQuery {
  reservationProfile: ReservationProfile;
  pickUpLocation: LocationSummary;
  pickUpLocalDate: LocalDate;
  pickUpLocalTime: LocalTime;
  dropOffLocation: LocationSummary;
  dropOffLocalDate: LocalDate;
  dropOffLocalTime: LocalTime;
}

export const API_AvailableVehicleSearchQuery = t.interface({
  reservationProfile: ReservationProfile,
  pickUpLocation: LocationSummary,
  pickUpLocalDate: LocalDate,
  pickUpLocalTime: LocalTime,
  dropOffLocation: LocationSummary,
  dropOffLocalDate: LocalDate,
  dropOffLocalTime: LocalTime
});

export interface API_AvailableVehicle {
  id: UUID;
  createdAt: Instant;
  queryId: UUID;
  externalId: string;
  pickUpLocation: LocationSummary;
  dropOffLocation: LocationSummary;
  onRequest: boolean;
}

export const API_AvailableVehicle = t.interface({
  id: UUID,
  createdAt: Instant,
  queryId: UUID,
  externalId: t.string,
  pickUpLocation: LocationSummary,
  dropOffLocation: LocationSummary,
  onRequest: t.boolean
});

export interface AvailableSpecialEquipment {
  atMost: number;
}

export const AvailableSpecialEquipment = t.interface(
  {
    atMost: t.Integer
  },
  'AvailableSpecialEquipment'
);
