import {
  UUID,
  API_AvailableVehicleSearchQuery,
  API_AvailableVehicle,
  AvailableSpecialEquipment
} from './models';
import { TaskEither, fromPredicate } from 'fp-ts/lib/TaskEither';
import { fromEquals } from 'fp-ts/lib/Setoid';
import { constVoid } from 'fp-ts/lib/function';

export declare const API: {
  availableVehicleController_readQuery: (params: {
    id: UUID;
  }) => Promise<API_AvailableVehicleSearchQuery>;
  availableVehicleController_read: (params: {
    id: UUID;
  }) => Promise<API_AvailableVehicle>;
  locationsController_searchSpecialEquipments: (params: {
    location: string;
    duration: number;
  }) => Promise<Array<AvailableSpecialEquipment>>;
};
export declare const taskEitherAPI: {
  availableVehicleController_readQuery: (params: {
    id: UUID;
  }) => TaskEither<void, API_AvailableVehicleSearchQuery>;
  availableVehicleController_read: (params: {
    id: UUID;
  }) => TaskEither<void, API_AvailableVehicle>;
  locationsController_searchSpecialEquipments: (params: {
    location: string;
    duration: number;
  }) => TaskEither<void, Array<AvailableSpecialEquipment>>;
};

export function isNonNullable<A>(x: A): x is NonNullable<A> {
  return x != null;
}
export const fromNullable: <A>(
  a?: A | null
) => TaskEither<void, A> = fromPredicate(isNonNullable, constVoid);
export const setoidNullableString = fromEquals(
  (a?: string | null, b?: string | null) => a === b
);
