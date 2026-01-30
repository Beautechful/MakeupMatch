export type colorPointType = {
  position: {
    L: number;
    a: number;
    b: number;
  };
  color: string;
  description: string;
};

export type cieLab = {
  L: number;
  a: number;
  b: number;
};

export type colorPointsType = {
  points: colorPointType[];
};
