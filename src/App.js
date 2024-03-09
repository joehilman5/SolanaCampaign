
import './App.css';

import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3, utils, BN, } from '@project-serum/anchor';
import { useEffect, useState } from 'react';

import {Buffer} from 'buffer';
window.Buffer = Buffer;

const programId = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed",
};
const {SystemProgram} = web3;

function App() {

  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
    return provider;
  };

  const checkIfWalletIsConnected = async () => {
    try {

      const {solana} = window;
      if(solana) {
        if(solana.isPhantom) {
          console.log("Phantom Wallet Found!");
          const response = await solana.connect({
            onlyIfTrusted: true,
          });
          console.log("Connected with public key: ", response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Wallet");
      }

    }catch(err) {
      console.error(err);
    }
  };
  const connectWallet = async () => {
    const {solana} = window;
    if(solana) {
      const response = await solana.connect();
      console.log('Connected with public key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const getCampaigns = async () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = getProvider();
    const program = new Program(idl, programId, provider);
    Promise.all(
      (await connection.getProgramAccounts(programId)).map(
        async (campaign) => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
        })
      )
    ).then((campaigns) => setCampaigns(campaigns));
  };

  const createCampaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      const [campaign] = await PublicKey.findProgramAddressSync([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
      );
      await program.rpc.create('campaign name', 'campaign description', {
        accounts: {
          campaign,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log("Created a new campaign account:", campaign.toString());
    }catch(err) {
      console.error(err);
    }
  };

  const donate = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.rpc.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
        accounts: {
         campaign: publicKey,
         user: provider.wallet.publicKey,
         systemProgram: SystemProgram.programId, 
        },
      });
      console.log('Doncated some money to:', publicKey.toString());
      getCampaigns();
    }catch(err) {
      console.error(err);
    }
  };

  const withdraw = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.rpc.withdraw(new BN(0.2 * web3.LAMPORTS_PER_SOL), {
        accounts: {
         campaign: publicKey,
         user: provider.wallet.publicKey, 
        },
      });
      console.log("Withdrew some money from:", publicKey.toString());
      getCampaigns();
    }catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, [])

  return (
    <div className="App">
      {walletAddress ? (
        <div>
          <button onClick={createCampaign}>Create Campaign</button>
          <button onClick={getCampaigns}>List Campaigns</button>
          <br />
          {campaigns.map(campaign => (
            <>
            <p>Campaign Id: {campaign.pubkey.toString()}</p>
            <p>Balance: {" "}{
              (campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}
            </p>
            <p>{campaign.name}</p>
            <p>{campaign.desc}</p>
            <button onClick={() => donate(campaign.pubkey)}>
              Donate!
            </button>
            <button onClick={() => withdraw(campaign.pubkey)}>
              Withdraw!
            </button>
            <br />
            </>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={connectWallet}>Connect Wallet</button>
          
        </div>
      )}
    </div>
  );
}

export default App;
