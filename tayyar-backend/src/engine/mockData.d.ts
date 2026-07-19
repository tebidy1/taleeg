import { Student, Mission } from "../types/index";
export declare function getMockStudent(): Student;
export declare const FREE_TRIAL_ORDER: string[];
/** Get a mission by id; falls back to the first free-trial mission. */
export declare function getMockMission(missionId?: string): Mission;
export declare function listMissions(): {
    id: string;
    title_ar: string;
    order: number;
    teaser_ar?: string;
}[];
//# sourceMappingURL=mockData.d.ts.map