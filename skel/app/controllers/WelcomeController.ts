import { Request, Response } from 'express';

//
module.exports.index = (req: Request, res: Response) => {
  res.render('welcome/index');
};
