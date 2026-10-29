import type { ReactNode } from 'react'

/**
 * Fake UIs for the "everyday AI" slide. Pure HTML/CSS (see theme/mockups.css), generic names only.
 * Each one is 1360x610 and is meant to read at a glance from the back of a room.
 */

function Browser({ url, tab, children }: { url: string; tab: string; children: ReactNode }) {
  return (
    <div className="mk-win">
      <div className="mk-tabs">
        <div className="mk-dots"><i /><i /><i /></div>
        <div className="mk-tab">{tab}</div>
      </div>
      <div className="mk-urlrow"><span>‹</span><span>›</span><span>↻</span><div className="mk-url">{url}</div></div>
      <div className="mk-page">{children}</div>
    </div>
  )
}

/** 1. A general-purpose chatbot in a browser tab. */
export function BrowserChatbot() {
  return (
    <div className="mk">
      <Browser url="https://assistant.example.com/chat" tab="Assistant: New chat">
        <div className="mk-chat">
          <aside className="mk-side">
            <b>+ New chat</b>
            <p className="on">Agents vs. workflows</p>
            <p>Trip ideas for October</p>
            <p>Fix my CV summary</p>
            <p>Explain compound interest</p>
            <p>Recipe: lentil soup</p>
          </aside>
          <div className="mk-main">
            <div className="mk-msgs">
              <div className="mk-u">Can you explain agents vs. workflows like I'm new to this?</div>
              <div className="mk-a">
                <div className="mk-av">✦</div>
                <div>
                  <p>Sure! In a <b>workflow</b>, a person decides the steps in advance and the model just fills them in. In an <b>agent</b>, the model decides what to do next: which tool to use, and when it's finished.</p>
                </div>
              </div>
              <div className="mk-u">Give me an example of each.</div>
              <div className="mk-a">
                <div className="mk-av">✦</div>
                <ul>
                  <li><b>Workflow:</b> write copy → translate → adjust tone, always in that order.</li>
                  <li><b>Agent:</b> “make the failing tests pass”: it reads files, runs tests and retries until they do.</li>
                </ul>
              </div>
            </div>
            <div className="mk-input"><span>Ask anything…</span><span>↑</span></div>
          </div>
        </div>
      </Browser>
    </div>
  )
}

/** 2. Search engine with an AI overview above the classic results. */
export function SearchAssistant() {
  return (
    <div className="mk">
      <Browser url="https://searchly.example/search?q=how+to+get+red+wine+out+of+carpet" tab="red wine out of carpet - Searchly">
        <div className="mk-search">
          <div className="mk-sbar">
            <div className="mk-logo">Searchly</div>
            <div className="mk-box"><span>how do I get a red wine stain out of carpet</span><span>⌕</span></div>
          </div>
          <div className="mk-stabs">
            <span className="on">All</span><span>Images</span><span>Videos</span><span>News</span><span>Maps</span><span>Shopping</span><span>More</span>
          </div>
          <div className="mk-body">
            <div className="mk-ai">
              <h4><span className="spark">✦</span> AI OVERVIEW</h4>
              <p>Act fast and <b>blot, don't rub</b>. Soak up as much wine as you can with a clean cloth, then:</p>
              <ol>
                <li>Cover the stain with salt or baking soda to draw the wine out.</li>
                <li>Dab with 1 tbsp dish soap + 1 tbsp white vinegar in 2 cups warm water.</li>
                <li>Rinse with cold water and blot dry.</li>
              </ol>
              <div className="mk-src"><span>homecare.example</span><span>cleanwise.example</span><span>+3 more</span></div>
            </div>
            <div className="mk-res">
              <small>cleanwise.example › stains › wine</small>
              <a>How to Remove Red Wine from Carpet in 5 Steps</a>
              <p>Blot first, then treat with a mild solution. Here's what works for fresh and dried stains…</p>
            </div>
            <div className="mk-res">
              <small>homecare.example › carpets</small>
              <a>Red wine on the carpet? Don't panic</a>
              <p>The best household fixes, ranked, plus when it's time to call a professional cleaner…</p>
            </div>
          </div>
          <div className="mk-fade" />
        </div>
      </Browser>
    </div>
  )
}

/** 3. An AI assistant living inside a group chat on a phone. */
export function ChatApp() {
  return (
    <div className="mk">
      <div className="mk-phonewrap">
        <div className="mk-note"><b>Asked inside the chat</b>Type “@AI” in any conversation and the assistant answers where everyone can see it.</div>
        <div className="mk-phone">
          <div className="mk-screen">
            <div className="mk-phead">
              <div className="mk-av">FD</div>
              <div><b>Friday dinner</b><small>Sam, Priya, Leo, You</small></div>
            </div>
            <div className="mk-pmsgs">
              <div className="mk-b"><small>Sam</small>Where should we eat Friday? 6 of us, one vegan</div>
              <div className="mk-b me">@AI find somewhere near the station</div>
              <div className="mk-b ai">
                <small>✦ AI</small>
                Three good options within 10 min of the station:
                <ol>
                  <li><b>Olive &amp; Fig</b>: Mediterranean, full vegan menu</li>
                  <li><b>Ramen Hub</b>: vegan broth available</li>
                  <li><b>Casa Verde</b>: tapas, table for 6 free at 7pm</li>
                </ol>
                <div className="mk-btn">Book a table</div>
              </div>
            </div>
            <div className="mk-chips"><span>Olive &amp; Fig works</span><span>Book it</span><span>Show more</span></div>
            <div className="mk-pinput"><span>Message</span><span>AI</span></div>
          </div>
        </div>
        <div className="mk-note"><b>Also built in</b>Suggested replies, summaries of long group chats, and help drafting messages.</div>
      </div>
    </div>
  )
}

/** 4. A coding assistant inside an IDE: inline completion plus an agent panel. */
export function IDEAssistant() {
  return (
    <div className="mk">
      <div className="mk-win mk-ide">
        <div className="mk-tabs"><div className="mk-dots"><i /><i /><i /></div><span style={{ alignSelf: 'center', fontSize: 15, color: '#667085' }}>cart.py — shop</span></div>
        <div className="mk-idebody">
          <div className="mk-act"><i /><i /><i /><i /></div>
          <div className="mk-tree">
            <b>SHOP</b>
            <div>▾ shop</div>
            <div className="in on">cart.py</div>
            <div className="in">prices.py</div>
            <div>▾ tests</div>
            <div className="in">test_cart.py</div>
            <div>README.md</div>
          </div>
          <div className="mk-ed">
            <div className="mk-edtab"><span>cart.py</span></div>
            <div className="mk-code">
              <div><span className="n">1</span><span><span className="kw">def</span> <span className="fn">total</span>(items, tax_rate=<span className="num">0.2</span>):</span></div>
              <div><span className="n">2</span>    subtotal = <span className="num">0</span></div>
              <div className="add"><span className="n">3</span>    <span className="kw">for</span> item <span className="kw">in</span> items:</div>
              <div><span className="n">4</span>        subtotal += item.price * item.qty</div>
              <div><span className="n">5</span>    <span className="kw">return</span> <span className="fn">round</span>(subtotal * (<span className="num">1</span> + tax_rate), <span className="num">2</span>)</div>
              <div><span className="n">6</span></div>
              <div><span className="n">7</span><span><span className="kw">def</span> <span className="fn">apply_discount</span>(amount, code):</span></div>
              <div><span className="n">8</span>    <span className="kw">if</span> code == <span className="str">"SAVE10"</span>:</div>
              <div><span className="n">9</span>        <span className="kw">return</span> amount * <span className="num">0.9</span></div>
              <div className="ghost"><span className="n">10</span>    <span className="kw">return</span> amount<span className="tabhint">Tab to accept</span></div>
            </div>
          </div>
          <div className="mk-assist">
            <header>✦ ASSISTANT</header>
            <div className="mk-amsgs">
              <div className="mk-u">test_total is failing. Can you fix it?</div>
              <div className="mk-steps">
                <span><b>✓</b>Read cart.py, test_cart.py</span>
                <span><b>✓</b>Ran pytest: 1 failed</span>
                <span><b>✓</b>Edited cart.py</span>
                <span><b>✓</b>Ran pytest: 4 passed</span>
              </div>
              <div className="mk-diff">
                <div className="d">- for i in range(len(items) - 1):</div>
                <div className="d">-     subtotal += items[i].price * items[i].qty</div>
                <div className="a">+ for item in items:</div>
                <div className="a">+     subtotal += item.price * item.qty</div>
              </div>
              <p>Fixed an off-by-one: the loop skipped the last item.</p>
            </div>
          </div>
        </div>
        <div className="mk-status"><span>main</span><span>Python</span><span>Ln 10, Col 19</span></div>
      </div>
    </div>
  )
}
