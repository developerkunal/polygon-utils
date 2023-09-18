import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import download from 'downloadjs';
import './App.css'; // Import your CSS file

const polygonRpcUrl = 'https://polygon-rpc.com/';

function App() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [addresses, setAddresses] = useState('');
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredAddressArray, setFilteredAddressArray] = useState([]);
  const [csvData, setCsvData] = useState('');
  const [activeTab, setActiveTab] = useState('tokenBalances');
  const [tokenAddress, setTokenAddress] = useState('');
  const contractAbi = [
    {
      inputs: [
        { internalType: 'address', name: 'tokenAddress', type: 'address' },
        { internalType: 'address[]', name: 'users', type: 'address[]' },
      ],
      name: 'getBalances',
      outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address[]', name: 'users', type: 'address[]' }],
      name: 'getGasBalance',
      outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
      stateMutability: 'view',
      type: 'function',
    },
  ]; // Replace with the ABI of your contract
  useEffect(() => {
    // Connect to Polygon network when the component mounts
    connectToPolygon();
  }, []);

  const connectToPolygon = async () => {
    try {
      const polyProvider = new ethers.JsonRpcProvider(polygonRpcUrl);
      const polyContract = new ethers.Contract(
        // Use the user-entered token address or a default address
        '0x7215a67E6D6B19650c5E355cBC5512514C5c96c9',
        contractAbi,
        polyProvider,
      );

      setProvider(polyProvider);
      setContract(polyContract);
    } catch (error) {
      console.error(error);
      alert('Error connecting to Polygon. Please check your connection or Polygon RPC settings.');
    }
  };

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const addressArray = addresses.split('\n').map(line => line.trim());

      // Remove any empty strings from the addressArray
      const filteredArray = addressArray.filter(address => address !== '');

      // Set the filtered addresses into the state
      setFilteredAddressArray(filteredArray);

      // Fetch the decimal places of the token
      const tokenContract = new ethers.Contract(
        tokenAddress, // Use the user-entered token address
        ['function decimals() view returns (uint8)'],
        provider,
      );

      const tokenDecimals = await tokenContract.decimals();

      // Split the filteredAddressArray into batches of 400
      const batchedAddresses = [];
      for (let i = 0; i < filteredArray.length; i += 400) {
        batchedAddresses.push(filteredArray.slice(i, i + 400));
      }

      // Fetch balances for each batch
      const allBalances = [];
      for (const batch of batchedAddresses) {
        const batchBalances = await contract.getBalances(
          // Use the user-entered token address or a default address
          tokenAddress || '0xC23b435BB5Fa6C31c3006b67783CB7A20114B966',
          batch,
        );
        console.log(batchBalances);

        // Format balances using formatUnits with the fetched token decimals
        const formattedBalances = batchBalances.map(balance => ethers.formatUnits(balance, tokenDecimals));

        allBalances.push(...formattedBalances);
      }

      setBalances(allBalances);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const fetchGasBalances = async () => {
    setLoading(true);
    try {
      const addressArray = addresses.split('\n').map(line => line.trim());

      // Remove any empty strings from the addressArray
      const filteredArray = addressArray.filter(address => address !== '');

      // Set the filtered addresses into the state
      setFilteredAddressArray(filteredArray);

      // Split the filteredAddressArray into batches of 400
      const batchedAddresses = [];
      for (let i = 0; i < filteredArray.length; i += 400) {
        batchedAddresses.push(filteredArray.slice(i, i + 400));
      }

      // Fetch gas balances for each batch
      const allGasBalances = [];
      for (const batch of batchedAddresses) {
        const batchGasBalances = await contract.getGasBalance(batch);

        // Convert gas balances to ethers using formatEther
        const formattedBalances = batchGasBalances.map(balance => ethers.formatEther(balance));

        allGasBalances.push(...formattedBalances);
      }

      setBalances(allGasBalances);
      console.log(allGasBalances);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const generateCSVData = () => {
    const csvRows = [];
    csvRows.push(['Address', 'Balance']); // Header row

    for (let i = 0; i < filteredAddressArray.length; i++) {
      const address = filteredAddressArray[i];
      const balance = balances[i];
      csvRows.push([address, balance]);
    }

    return csvRows.map(row => row.join(',')).join('\n');
  };

  const handleExportClick = () => {
    const csv = generateCSVData();

    // Generate a unique filename for the CSV file
    const filename = `balances_${new Date().toISOString()}.csv`;

    // Use the downloadjs library to initiate the file download
    download(csv, filename, 'text/csv');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Polygon Utils</h1>
        <p>Fetch bulk balances of users for erc20 as well as Matic balances</p>
      </header>
      <main>
        <div className="Tabs">
          <button className={activeTab === 'tokenBalances' ? 'active' : ''} onClick={() => setActiveTab('tokenBalances')}>
            Fetch Token Balances
          </button>
          <button className={activeTab === 'gasBalances' ? 'active' : ''} onClick={() => setActiveTab('gasBalances')}>
            Fetch Gas Balances
          </button>
        </div>
        {activeTab === 'tokenBalances' && (
          <div className="InputSection">
            <input type="text" placeholder="Token Contract Address" value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} />
            <textarea placeholder="Enter addresses (one per line)" value={addresses} onChange={e => setAddresses(e.target.value)} />
            <button onClick={fetchBalances} disabled={!provider || loading || !tokenAddress}>
              Fetch Token Balances
            </button>
          </div>
        )}
        {activeTab === 'gasBalances' && (
          <div className="InputSection">
            <textarea placeholder="Enter addresses (one per line)" value={addresses} onChange={e => setAddresses(e.target.value)} />
            <button onClick={fetchGasBalances} disabled={!provider || loading}>
              Fetch Gas Balances
            </button>
          </div>
        )}
        <button onClick={handleExportClick}>Export CSV</button>
        <table>
          <thead>
            <tr>
              <th>Address</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance, index) => (
              <tr key={index}>
                <td>{filteredAddressArray[index]}</td>
                <td>{balance.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <footer className="App-footer">
        <p>Polygon Utils &copy; 2023</p>
      </footer>
    </div>
  );
}

export default App;
