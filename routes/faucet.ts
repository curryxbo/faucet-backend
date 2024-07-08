import express from "express";
const router = express.Router();

import got from "got";
import { User, Transaction } from "../database";
import * as faucet from "../faucet";
import { ensureAuthenticated, blockedAddresses, rateLimit } from "../utils";
import { ethToEthermint } from "@hanchon/ethermint-address-converter";

const DOMAIN = process.env.AUTH0_DOMAIN;

import client from "prom-client";

const counterDrip = new client.Counter({
  name: "faucet_transaction_count",
  help: "faucet_transaction_count is the number of times the faucet dripped",
});

const counterDripError = new client.Counter({
  name: "faucet_transaction_error",
  help: "faucet_transaction_count is the number of times the faucet errored while dripping",
});

router.post(
  "/",
  ensureAuthenticated,
  blockedAddresses,
  rateLimit,
  async (req: any, res: any, next: any) => {
    let { address } = req.body;
    try {
      if (address.length < 2){
        counterDripError.inc();
        res.status(422).send(JSON.stringify({ error: "Invalid wallet" }));
        return
      } 

      if (address[0] === "0" && address[1]==="x") {
        address = ethToEthermint(address)
      } 

    } catch(error) {
      counterDripError.inc();
      res.status(422).send(JSON.stringify({ error: "Invalid wallet" }));
    }

    try {
      // if (!req.user.id) {
      //   const { body } = await got(`https://${DOMAIN}/userinfo`, {
      //     headers: { authorization: req.headers.authorization },
      //     responseType: "json",
      //   });
      //   let { nickname, name, email, picture } = body as any;
      //   let user: any = await User.create({
      //     sub: req.user.sub,
      //     nickname,
      //     name,
      //     email,
      //     picture,
      //   });
      //   req.user = Object.assign(req.user, user.dataValues);
      // }
      // let transaction = await Transaction.create({
      //   userId: req.user.id,
      //   address: address,
      //   amount: faucet.getDistributionAmount(),
      // });
      const result = await faucet.sendTokens(address, null);
      // transaction.update({ transactionHash: result.transactionHash });
      // counterDrip.inc();
      res
        .status(201)
        .send(JSON.stringify({ transactionHash: result.transactionHash }));
    } catch (error) {
      counterDripError.inc();
      res.status(422).send(JSON.stringify({ error: error.message }));
    }
  }
);

export { router };
